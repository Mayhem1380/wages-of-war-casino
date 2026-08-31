"""
Wages of War — full E2E backend sweep (iteration 14).
Modules: auth, slots catalogue + spin (flagship & basic), keno, wheel,
tournament, cashier, admin/HQ, support.
"""
import os
import re
import time
import uuid
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

_env = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or _env.get("REACT_APP_BACKEND_URL")).rstrip("/")
API = f"{BASE_URL}/api"

NEW22 = [
    "solar_vanguard", "obsidian_empire", "neon_pharaoh", "crimson_vanguard", "golden_atlas",
    "emerald_guardian", "cobalt_siege", "royal_ordnance", "jade_dynasty", "inferno_warlord",
    "arctic_recon", "midas_command", "phantom_strike", "thunder_baron", "desert_fury",
    "steel_leviathan", "crimson_dynasty", "venom_squadron", "platinum_siege", "ember_legion",
    "sapphire_command", "golden_griffin",
]


def _creds():
    txt = Path("/app/memory/test_credentials.md").read_text()
    email = re.search(r"Email:\s*`([^`]+)`", txt).group(1)
    pwd = re.search(r"Password:\s*`([^`]+)`", txt).group(1)
    pin = re.search(r"PIN:\s*`([^`]+)`", txt).group(1)
    return email, pwd, pin


ADMIN_EMAIL, ADMIN_PASS, HQ_PIN = _creds()


@pytest.fixture(scope="session")
def admin():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"admin login failed {r.status_code}: {r.text[:300]}")
    tok = r.json()["token"]
    s.headers.update({"Authorization": f"Bearer {tok}"})
    return s


@pytest.fixture(scope="session")
def player():
    s = requests.Session()
    email = f"test_qa_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{API}/auth/register",
               json={"email": email, "password": "QaPass123!", "name": "TEST_QA Player"}, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"register failed {r.status_code}: {r.text[:300]}")
    body = r.json()
    s.headers.update({"Authorization": f"Bearer {body['token']}"})
    s.email = email
    s.user = body["user"]
    return s


# ---------------------------------------------------------------- health / auth
class TestAuth:
    def test_root_health(self):
        r = requests.get(f"{API}/", timeout=30)
        assert r.status_code == 200

    def test_register_new_player(self, player):
        assert player.user["email"] == player.email
        assert player.user["balance"] > 0
        assert player.user["role"] == "player"

    def test_login_returns_httponly_cookie(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=30)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "admin"
        raw = r.headers.get("set-cookie", "")
        assert "access_token" in raw, f"no access_token cookie: {raw[:200]}"
        assert "HttpOnly" in raw or "httponly" in raw

    def test_bcrypt_hash_format(self):
        import asyncio

        from motor.motor_asyncio import AsyncIOMotorClient
        benv = dotenv_values("/app/backend/.env")

        async def go():
            c = AsyncIOMotorClient(benv["MONGO_URL"])
            u = await c[benv["DB_NAME"]].users.find_one({"email": ADMIN_EMAIL})
            c.close()
            return u
        u = asyncio.get_event_loop().run_until_complete(go()) if False else asyncio.run(go())
        assert u is not None, "admin not seeded"
        assert u["password_hash"].startswith("$2b$"), u["password_hash"][:10]

    def test_login_invalid_password(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": ADMIN_EMAIL, "password": "wrong-pass-xyz"}, timeout=30)
        assert r.status_code == 401

    def test_brute_force_lockout(self):
        """6 bad logins in a row should eventually be rate-limited (423/429)."""
        email = f"TEST_bf_{uuid.uuid4().hex[:6]}@example.com"
        requests.post(f"{API}/auth/register",
                      json={"email": email, "password": "QaPass123!", "name": "TEST_BF"}, timeout=30)
        codes = []
        for _ in range(6):
            codes.append(requests.post(f"{API}/auth/login",
                                       json={"email": email, "password": "bad"}, timeout=30).status_code)
        assert any(c in (423, 429) for c in codes), f"no lockout, codes={codes}"

    def test_me_requires_auth(self):
        assert requests.get(f"{API}/auth/me", timeout=30).status_code in (401, 403)

    def test_me_authenticated(self, player):
        r = player.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 200
        assert r.json()["email"] == player.email

    def test_cors_credentials(self):
        """Credentialed CORS must echo an explicit origin, never '*'."""
        r = requests.post(f"{API}/auth/login", timeout=30,
                          headers={"Origin": BASE_URL, "Content-Type": "application/json"},
                          json={"email": "nobody@example.com", "password": "x"})
        assert r.headers.get("access-control-allow-credentials") == "true"
        assert r.headers.get("access-control-allow-origin") != "*", \
            "ACAO '*' with credentials=true (allow_origin_regex='.*') - browsers reject and it is a CSRF vector"


# ---------------------------------------------------------------- slots
class TestSlots:
    def test_catalogue(self):
        r = requests.get(f"{API}/games/slots", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 130
        ids = {s["id"] for s in data}
        missing = [n for n in NEW22 if n not in ids]
        assert not missing, f"new flagships missing from catalogue: {missing}"
        for s in data:
            assert "_id" not in s
            assert s["name"] and s["id"]

    @pytest.mark.parametrize("sid", NEW22)
    def test_new_flagship_detail(self, sid):
        r = requests.get(f"{API}/games/slots/{sid}", timeout=30)
        assert r.status_code == 200, r.text[:200]
        d = r.json()
        assert d["id"] == sid
        syms = d.get("symbols") or d.get("reels") or d.get("grid")
        assert syms, f"{sid} detail has no symbol data: {list(d)}"

    def test_unknown_slot_404(self):
        assert requests.get(f"{API}/games/slots/not_a_slot_xyz", timeout=30).status_code == 404

    def test_spin_flagship_debits_balance(self, player):
        before = player.get(f"{API}/auth/me", timeout=30).json()["balance"]
        r = player.post(f"{API}/games/slots/spin",
                        json={"machine_id": "solar_vanguard", "bet": 20}, timeout=60)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert "balance" in d and "grid" in d or "reels" in d, list(d)
        grid = d.get("grid") or d.get("reels")
        flat = [c for row in grid for c in (row if isinstance(row, list) else [row])]
        assert all(c not in (None, "") for c in flat), f"blank symbols in grid: {grid}"
        expected = before - 20 + float(d.get("win", d.get("payout", 0)) or 0)
        assert abs(d["balance"] - expected) < 0.01, f"before={before} after={d['balance']} win={d.get('win')}"
        after = player.get(f"{API}/auth/me", timeout=30).json()["balance"]
        assert abs(after - d["balance"]) < 0.01, "balance not persisted"

    def test_spin_basic_slot(self, player):
        r = player.post(f"{API}/games/slots/spin",
                        json={"machine_id": "mega_moolah", "bet": 20}, timeout=60)
        assert r.status_code == 200, r.text[:300]
        assert "balance" in r.json()

    def test_spin_requires_auth(self):
        r = requests.post(f"{API}/games/slots/spin",
                          json={"machine_id": "solar_vanguard", "bet": 20}, timeout=30)
        assert r.status_code in (401, 403)

    def test_spin_rejects_bad_bet(self, player):
        r = player.post(f"{API}/games/slots/spin",
                        json={"machine_id": "solar_vanguard", "bet": -5}, timeout=30)
        assert r.status_code in (400, 422), r.status_code

    def test_spin_rejects_unknown_machine(self, player):
        r = player.post(f"{API}/games/slots/spin",
                        json={"machine_id": "nope_xyz", "bet": 20}, timeout=30)
        assert r.status_code in (400, 404), r.status_code

    def test_spin_rejects_over_balance(self, player):
        r = player.post(f"{API}/games/slots/spin",
                        json={"machine_id": "solar_vanguard", "bet": 99_999_999}, timeout=30)
        assert r.status_code in (400, 402, 422), r.status_code


# ---------------------------------------------------------------- keno
class TestKeno:
    def test_paytable(self):
        r = requests.get(f"{API}/games/keno/paytable", timeout=30)
        assert r.status_code == 200
        assert r.json()

    def test_play(self, player):
        before = player.get(f"{API}/auth/me", timeout=30).json()["balance"]
        r = player.post(f"{API}/games/keno/play",
                        json={"picks": [1, 5, 9, 14, 22], "stake": 25}, timeout=60)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        drawn = d.get("drawn") or d.get("draw") or d.get("numbers")
        assert drawn and len(drawn) == 20, f"expected 20 balls, got {drawn}"
        assert len(set(drawn)) == 20, "duplicate balls drawn"
        assert d["balance"] <= before - 25 + float(d.get("win", 0) or 0) + 0.01

    def test_duplicate_picks_are_deduped(self, player):
        r = player.post(f"{API}/games/keno/play", json={"picks": [1, 1, 1], "stake": 25}, timeout=30)
        assert r.status_code == 200, r.text[:200]
        assert r.json()["picks"] == [1], r.json()["picks"]

    def test_play_rejects_out_of_range(self, player):
        r = player.post(f"{API}/games/keno/play", json={"picks": [0, 99], "stake": 25}, timeout=30)
        assert r.status_code in (400, 422), r.status_code


# ---------------------------------------------------------------- wheel / tournament
class TestWheelTournament:
    def test_wheel_status(self, player):
        r = player.get(f"{API}/wheel/status", timeout=30)
        assert r.status_code == 200
        assert "available" in r.json() or "can_spin" in r.json(), list(r.json())

    def test_wheel_spin(self, player):
        r = player.post(f"{API}/wheel/spin", json={}, timeout=60)
        assert r.status_code in (200, 400), r.text[:300]
        if r.status_code == 200:
            d = r.json()
            assert "balance" in d
            # second spin same day should be blocked
            r2 = player.post(f"{API}/wheel/spin", json={}, timeout=60)
            assert r2.status_code in (400, 429), f"daily wheel not rate limited: {r2.status_code}"

    def test_tournament_current(self):
        r = requests.get(f"{API}/tournament/current", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "leaderboard" in d or "entries" in d, list(d)

    def test_tournament_champions(self):
        r = requests.get(f"{API}/tournament/champions", timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), (list, dict))

    def test_leaderboard(self):
        r = requests.get(f"{API}/leaderboard", timeout=30)
        assert r.status_code == 200


# ---------------------------------------------------------------- cashier
class TestCashier:
    def test_currencies(self):
        r = requests.get(f"{API}/cashier/currencies", timeout=30)
        assert r.status_code == 200 and r.json()

    def test_summary(self, player):
        r = player.get(f"{API}/cashier/summary", timeout=30)
        assert r.status_code == 200, r.text[:200]

    def test_packages(self):
        r = requests.get(f"{API}/payments/packages", timeout=30)
        assert r.status_code == 200 and r.json()

    def test_kyc_status(self, player):
        r = player.get(f"{API}/kyc/status", timeout=30)
        assert r.status_code == 200
        assert r.json().get("kyc_approved") in (False, None, True)

    def test_withdraw_blocked_without_kyc(self, player):
        r = player.post(f"{API}/cashier/withdraw",
                        json={"currency": "usd", "amount": 20, "destination": "TEST_dest_acct_1234"}, timeout=30)
        assert r.status_code in (400, 402, 403), f"withdrawal not KYC-gated: {r.status_code} {r.text[:200]}"

    def test_transactions(self, player):
        r = player.get(f"{API}/cashier/transactions", timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), (list, dict))

    def test_wallet_transactions(self, player):
        r = player.get(f"{API}/wallet/transactions", timeout=30)
        assert r.status_code == 200


# ---------------------------------------------------------------- admin / HQ
class TestAdminHQ:
    def test_stats(self, admin):
        r = admin.get(f"{API}/admin/stats", timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), dict)

    def test_players(self, admin):
        r = admin.get(f"{API}/admin/players", timeout=30)
        assert r.status_code == 200
        rows = r.json()
        rows = rows if isinstance(rows, list) else rows.get("players", [])
        assert all("_id" not in x for x in rows)

    def test_bankroll(self, admin):
        r = admin.get(f"{API}/admin/bankroll", timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ("house_bankroll_usd", "available_usd", "coverage_ratio", "pending_payout_usd"):
            assert k in d, f"{k} missing from bankroll: {list(d)}"

    def test_admin_requires_admin_role(self, player):
        assert player.get(f"{API}/admin/stats", timeout=30).status_code in (401, 403)

    def test_hq_inbox_requires_pin(self, admin):
        r = admin.get(f"{API}/support/tickets", timeout=30)
        assert r.status_code == 403, f"HQ inbox open without PIN: {r.status_code}"

    def test_hq_inbox_wrong_pin(self, admin):
        r = admin.get(f"{API}/support/tickets", headers={"X-HQ-Pin": "0000"}, timeout=30)
        assert r.status_code == 403

    def test_support_ticket_appears_in_hq(self, admin):
        subject = f"TEST_sweep_{uuid.uuid4().hex[:6]}"
        c = requests.post(f"{API}/support/ticket", json={
            "name": "TEST_QA", "email": "qa@test.com", "subject": subject,
            "message": "Automated sweep ticket"}, timeout=30)
        assert c.status_code == 200, c.text[:200]
        tid = c.json()["id"]
        time.sleep(0.5)
        r = admin.get(f"{API}/support/tickets", headers={"X-HQ-Pin": HQ_PIN}, timeout=30)
        assert r.status_code == 200, f"HQ inbox with valid PIN failed: {r.status_code} {r.text[:200]}"
        rows = r.json()
        found = [x for x in rows if x["id"] == tid]
        assert found, f"ticket {subject} not in HQ inbox"
        assert found[0]["status"] == "open"
        assert "_id" not in found[0]
        # resolve it (cleanup-ish)
        res = admin.post(f"{API}/support/tickets/{tid}/resolve",
                         headers={"X-HQ-Pin": HQ_PIN}, timeout=30)
        assert res.status_code == 200
        rows2 = admin.get(f"{API}/support/tickets", headers={"X-HQ-Pin": HQ_PIN}, timeout=30).json()
        assert [x for x in rows2 if x["id"] == tid][0]["status"] == "resolved"

    def test_support_message_bot(self, player):
        r = player.post(f"{API}/support/message", json={"message": "How do I withdraw?"}, timeout=60)
        assert r.status_code == 200
        assert r.json().get("reply")

    def test_enquiries(self, admin):
        r = admin.get(f"{API}/admin/enquiries", timeout=30)
        assert r.status_code == 200
