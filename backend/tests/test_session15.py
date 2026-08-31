"""Iteration 15 targeted sweep: new slots (145), WARKINO modes, Shark Splitters streak."""
import os
import re
import uuid
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def creds():
    p = Path("/app/memory/test_credentials.md")
    c = p.read_text(encoding="utf-8")
    e = re.search(r"Email:\s*`([^`]+)`", c)
    pw = re.search(r"Password:\s*`([^`]+)`", c)
    if not e or not pw:
        pytest.skip("no creds")
    return {"email": e.group(1), "password": pw.group(1)}


@pytest.fixture(scope="session")
def client(creds):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json=creds, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"admin login failed {r.status_code}: {r.text[:300]}")
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok, f"no token in {r.json().keys()}"
    s.headers.update({"Authorization": f"Bearer {tok}"})
    return s


# --- health / catalogue -----------------------------------------------------
class TestCatalogue:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=30)
        assert r.status_code == 200
        assert r.json()["status"] == "operational"

    def test_slots_count_145(self):
        r = requests.get(f"{API}/games/slots", timeout=30)
        assert r.status_code == 200
        data = r.json()
        machines = data["machines"] if isinstance(data, dict) else data
        assert len(machines) == 145, f"expected 145 slots, got {len(machines)}"

    @pytest.mark.parametrize("mid", ["jungle_guerrilla", "gold_convoy", "iron_infantry", "crimson_circuit"])
    def test_new_slot_present(self, mid):
        r = requests.get(f"{API}/games/slots", timeout=30)
        data = r.json()
        machines = data["machines"] if isinstance(data, dict) else data
        ids = {m["machine_id"] if "machine_id" in m else m.get("id") for m in machines}
        assert mid in ids


# --- auth ------------------------------------------------------------------
class TestAuth:
    def test_register_and_me(self):
        email = f"TEST_it15_{uuid.uuid4().hex[:8]}@example.com"
        s = requests.Session()
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "secret123", "name": "TEST_it15"}, timeout=30)
        assert r.status_code in (200, 201), r.text[:300]
        body = r.json()
        tok = body.get("access_token") or body.get("token")
        assert tok
        s.headers.update({"Authorization": f"Bearer {tok}"})
        me = s.get(f"{API}/auth/me", timeout=30)
        assert me.status_code == 200
        assert me.json()["balance"] >= 1

    def test_bcrypt_hash_and_cookie(self, creds):
        r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
        assert r.status_code == 200
        assert "access_token" in r.cookies or any("access_token" in c for c in r.cookies.keys()), r.cookies.keys()

    def test_protected_requires_auth(self):
        r = requests.get(f"{API}/auth/me", timeout=30)
        assert r.status_code in (401, 403)

    def test_brute_force_lockout(self, creds):
        codes = []
        for _ in range(7):
            rr = requests.post(f"{API}/auth/login", json={"email": creds["email"], "password": "wrongwrong"}, timeout=30)
            codes.append(rr.status_code)
        assert any(c in (423, 429) for c in codes), f"no lockout, codes={codes}"


# --- slots spin -------------------------------------------------------------
class TestSlots:
    @pytest.mark.parametrize("mid", ["jungle_guerrilla", "gold_convoy", "iron_infantry", "crimson_circuit"])
    def test_spin_new_slots(self, client, mid):
        before = client.get(f"{API}/auth/me", timeout=30).json()["balance"]
        r = client.post(f"{API}/games/slots/spin", json={"machine_id": mid, "bet": 100}, timeout=45)
        assert r.status_code == 200, r.text[:400]
        d = r.json()
        assert "balance" in d
        expected = round(before - 100 + float(d.get("total_win", d.get("win", 0))), 2)
        assert abs(d["balance"] - expected) < 1.0, f"balance mismatch: before={before} resp={d['balance']} win={d.get('total_win')}"

    def test_spin_invalid_machine(self, client):
        r = client.post(f"{API}/games/slots/spin", json={"machine_id": "does_not_exist", "bet": 100}, timeout=30)
        assert r.status_code in (400, 404), r.status_code

    def test_spin_below_min_bet(self, client):
        r = client.post(f"{API}/games/slots/spin", json={"machine_id": "crimson_circuit", "bet": 0}, timeout=30)
        assert r.status_code in (400, 422)


# --- WARKINO ----------------------------------------------------------------
class TestKeno:
    def test_paytable(self):
        r = requests.get(f"{API}/games/keno/paytable", timeout=30)
        assert r.status_code == 200
        assert len(r.json()["paytable"]) > 0

    def test_warhead_play(self, client):
        r = client.post(f"{API}/games/keno/play", json={"picks": [1, 2, 3, 4, 5], "stake": 50}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert len(d["drawn"]) == 20
        assert sorted(d["picks"]) == [1, 2, 3, 4, 5]
        assert "win" in d and "balance" in d

    def test_wow_play(self, client):
        r = client.post(f"{API}/games/keno/wow", json={"picks": [7, 14, 21, 28], "stake": 50}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert "win" in d and "balance" in d
        assert len(d.get("drawn", [])) > 0

    def test_side_play_all_markets(self, client):
        r = client.post(f"{API}/games/keno/side", json={"bets": {"sum": "over", "parity": "odd", "zone": "high"}, "stake": 50}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert len(d["legs"]) == 3
        assert d["total_stake"] == 150
        won = [leg for leg in d["legs"] if leg["won"]]
        assert abs(d["win"] - round(len(won) * 50 * d["leg_payout"], 2)) < 0.05, d
        # outcome consistency
        assert len(d["drawn"]) == 20
        assert d["sum"] == sum(d["drawn"])
        for leg in d["legs"]:
            if leg["market"] == "sum":
                assert leg["outcome"] == ("over" if d["sum"] > 810 else "under")
            if leg["market"] == "zone":
                assert leg["outcome"] == ("high" if d["high_count"] > 10 else "low")

    def test_side_no_bets_rejected(self, client):
        r = client.post(f"{API}/games/keno/side", json={"bets": {}, "stake": 50}, timeout=30)
        assert r.status_code == 400

    def test_keno_min_stake(self, client):
        r = client.post(f"{API}/games/keno/play", json={"picks": [1, 2, 3], "stake": 1}, timeout=30)
        assert r.status_code == 400


# --- Shark Splitters --------------------------------------------------------
class TestShark:
    def test_flip_and_streak(self, client):
        outcomes = []
        prev_streak = None
        for _ in range(12):
            r = client.post(f"{API}/games/shark/flip", json={"bet": 50}, timeout=30)
            assert r.status_code == 200, r.text[:300]
            d = r.json()
            for k in ("outcome", "win", "streak", "jackpot", "balance"):
                assert k in d, f"missing {k} in {d}"
            outcomes.append(d["outcome"])
            if prev_streak is not None:
                if d["win"] > 0 and not d["jackpot"]:
                    assert d["streak"] == prev_streak + 1, d
                elif d["win"] == 0:
                    assert d["streak"] == 0, d
            prev_streak = d["streak"]
        assert set(outcomes) <= {"evens", "heads", "tails", "split"}, outcomes

    def test_flip_min_bet(self, client):
        r = client.post(f"{API}/games/shark/flip", json={"bet": 1}, timeout=30)
        assert r.status_code == 400

    def test_flip_requires_auth(self):
        r = requests.post(f"{API}/games/shark/flip", json={"bet": 50}, timeout=30)
        assert r.status_code in (401, 403)


# --- other games ------------------------------------------------------------
class TestOtherGames:
    def test_coinflip(self, client):
        r = client.post(f"{API}/games/coinflip", json={"side": "heads", "bet": 50}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["outcome"] in ("heads", "tails")

    def test_leaderboard(self):
        r = requests.get(f"{API}/leaderboard", timeout=30)
        assert r.status_code == 200

    def test_tournament(self, client):
        r = client.get(f"{API}/tournament/current", timeout=30)
        assert r.status_code == 200

    def test_vip(self, client):
        r = client.get(f"{API}/vip/tiers", timeout=30)
        assert r.status_code == 200

    def test_wheel_status(self, client):
        r = client.get(f"{API}/wheel/status", timeout=30)
        assert r.status_code == 200


# --- cashier ---------------------------------------------------------------
class TestCashier:
    def test_packages(self, client):
        r = client.get(f"{API}/payments/packages", timeout=30)
        assert r.status_code == 200

    def test_meta(self, client):
        r = client.get(f"{API}/cashier/currencies", timeout=30)
        assert r.status_code == 200


# --- CORS -------------------------------------------------------------------
def test_cors_not_wildcard_with_credentials():
    r = requests.options(
        f"{API}/auth/login",
        headers={
            "Origin": "https://evil.example.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
        timeout=30,
    )
    allow = r.headers.get("access-control-allow-origin")
    cred = r.headers.get("access-control-allow-credentials")
    assert not (allow in ("*", "https://evil.example.com") and cred == "true"), f"origin={allow} creds={cred}"
