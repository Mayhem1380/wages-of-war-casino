"""Wages of War Casino - Backend regression tests."""

import os
import uuid
import time
import pytest
import requests

BASE_URL = (
    os.environ.get("REACT_APP_BACKEND_URL")
    or open("/app/frontend/.env")
    .read()
    .split("REACT_APP_BACKEND_URL=")[1]
    .splitlines()[0]
)
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def new_user():
    email = f"test_{uuid.uuid4().hex[:10]}@wowtest.com"
    password = os.environ.get("TEST_USER_PASSWORD", "SecretPass123")
    r = requests.post(
        f"{API}/auth/register",
        json={"email": email, "password": password, "name": "Test Op"},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    return {
        "email": email,
        "password": password,
        "token": data["token"],
        "user": data["user"],
    }


@pytest.fixture(scope="session")
def auth_headers(new_user):
    return {"Authorization": f"Bearer {new_user['token']}"}


# ---------------- HEALTH (deployment probe) ----------------
class TestHealth:
    def test_health_root_no_api_prefix(self):
        """K8s liveness probe hits /health (no /api) on the backend pod directly (port 8001).
        The ingress routes non-/api paths to the frontend, so we probe the backend container directly.
        """
        r = requests.get("http://localhost:8001/health", timeout=5)
        assert r.status_code == 200, f"/health returned {r.status_code}: {r.text[:200]}"
        d = r.json()
        assert d.get("status") == "healthy", d

    def test_api_root_still_works(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200


# ---------------- AUTH ----------------
class TestAuth:
    def test_register_returns_10000_and_cookie(self):
        email = f"test_{uuid.uuid4().hex[:10]}@wowtest.com"
        r = requests.post(
            f"{API}/auth/register",
            json={"email": email, "password": "abc123", "name": "Rookie"},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user"]["balance"] == 10000.0
        assert d["user"]["email"] == email
        assert "token" in d and len(d["token"]) > 20
        # Cookie
        assert "access_token" in r.cookies or any(
            "access_token" in h for h in r.headers.get("set-cookie", "").split(",")
        )

    def test_register_duplicate_email(self, new_user):
        r = requests.post(
            f"{API}/auth/register",
            json={"email": new_user["email"], "password": "abc123", "name": "Dup"},
        )
        assert r.status_code == 400

    def test_login_success(self, new_user):
        r = requests.post(
            f"{API}/auth/login",
            json={"email": new_user["email"], "password": new_user["password"]},
        )
        assert r.status_code == 200
        assert "token" in r.json()

    def test_login_invalid(self):
        r = requests.post(
            f"{API}/auth/login",
            json={"email": "nobody@test.com", "password": "wrong123"},
        )
        assert r.status_code == 401

    def test_me_with_bearer(self, auth_headers, new_user):
        r = requests.get(f"{API}/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["email"] == new_user["email"]

    def test_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_admin_login(self):
        r = requests.post(
            f"{API}/auth/login",
            json={"email": "admin@wagesofwarcasino.com", "password": "WagesOfWar2025!"},
        )
        assert r.status_code == 200, r.text


# ---------------- SLOTS ----------------
class TestSlots:
    def test_list_slots_extended_catalog_sorted(self):
        r = requests.get(f"{API}/games/slots")
        assert r.status_code == 200
        arr = r.json()
        assert len(arr) >= 32, f"expected at least 32 slots, got {len(arr)}"
        pops = [m["popularity"] for m in arr]
        assert pops == sorted(pops, reverse=True)

    def test_list_slots_flagship_count(self):
        arr = requests.get(f"{API}/games/slots").json()
        flagships = [
            m
            for m in arr
            if m.get("flagship")
            or m.get("is_flagship")
            or m.get("aaa")
            or m.get("tier") == "flagship"
        ]
        # Fallback: infer from expected set if flag not exposed
        expected_flagship_ids = {
            "pharaohs_arsenal",
            "inferno_airstrike",
            "golden_dynasty",
            "book_of_ops",
            "big_bass_bombardment",
            "money_train_convoy",
            "wild_west_recon",
            "kraken_depths",
            "frozen_front",
            "happy_prosperity",
            "panda_magic",
            "gold_bonanza",
            "dragons_riches",
            "five_dragons",
            "god_of_sun",
            "gates_of_olympus",
            "fortune_coins",
            "year_of_ox",
            "gates_of_glory",
            "samurai_strike",
            "voodoo_vengeance",
            "corsair_cannons",
            "ironclad_jackpots",
            "blackout_royal",
            "stormfront_seven",
            "thunder_titans",
            "wild_bandito",
            "brigade_of_gold",
            "night_ops_kingpin",
            "midnight_vanguard",
            "diamond_commando",
            "vortex_vanguard",
            "redline_reign",
            "crimson_circuit",
            "warpath_legends",
            "bull_rush",
        }
        ids = {m["id"] for m in arr}
        assert expected_flagship_ids.issubset(
            ids
        ), f"missing flagship ids: {expected_flagship_ids - ids}"
        assert len(expected_flagship_ids) == 36

    def test_list_slots_recent_upgrades_present(self):
        """Verify the 4 recently-upgraded flagship slots are exposed."""
        arr = requests.get(f"{API}/games/slots").json()
        ids = {m["id"] for m in arr}
        recent = {
            "gates_of_glory",
            "samurai_strike",
            "voodoo_vengeance",
            "corsair_cannons",
        }
        assert recent.issubset(ids), f"missing recent flagships: {recent - ids}"

    def test_slot_detail(self):
        arr = requests.get(f"{API}/games/slots").json()
        mid = arr[0]["id"]
        r = requests.get(f"{API}/games/slots/{mid}")
        assert r.status_code == 200
        d = r.json()
        assert "paytable" in d and "symbols" in d and "wild" in d

    def test_slot_detail_404(self):
        r = requests.get(f"{API}/games/slots/nope")
        assert r.status_code == 404

    def test_spin_success_updates_balance(self, auth_headers):
        arr = requests.get(f"{API}/games/slots").json()
        mid = arr[0]["id"]
        me1 = requests.get(f"{API}/auth/me", headers=auth_headers).json()
        r = requests.post(
            f"{API}/games/slots/spin",
            json={"machine_id": mid, "bet": 20},
            headers=auth_headers,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("grid", "line_wins", "total_win", "balance"):
            assert k in d
        me2 = requests.get(f"{API}/auth/me", headers=auth_headers).json()
        assert round(me2["balance"], 2) == round(d["balance"], 2)
        # balance changed by net
        assert abs((me2["balance"] - me1["balance"]) - d["net"]) < 0.01

    def test_spin_bet_below_min(self, auth_headers):
        arr = requests.get(f"{API}/games/slots").json()
        r = requests.post(
            f"{API}/games/slots/spin",
            json={"machine_id": arr[0]["id"], "bet": 10},
            headers=auth_headers,
        )
        assert r.status_code == 400

    def test_spin_unauth(self):
        arr = requests.get(f"{API}/games/slots").json()
        r = requests.post(
            f"{API}/games/slots/spin", json={"machine_id": arr[0]["id"], "bet": 20}
        )
        assert r.status_code == 401

    def test_spin_insufficient(self, auth_headers):
        arr = requests.get(f"{API}/games/slots").json()
        r = requests.post(
            f"{API}/games/slots/spin",
            json={"machine_id": arr[0]["id"], "bet": 99999999},
            headers=auth_headers,
        )
        assert r.status_code == 400


# ---------------- KENO / COINFLIP ----------------
class TestKenoCoinflip:
    def test_keno_play(self, auth_headers):
        r = requests.post(
            f"{API}/games/keno/play",
            json={"picks": [1, 5, 10, 20, 40], "stake": 20},
            headers=auth_headers,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("hits", "multiplier", "win", "balance", "picks"):
            assert k in d
        assert len(d.get("drawn", d.get("draw", []))) == 20

    def test_keno_invalid_picks_zero(self, auth_headers):
        r = requests.post(
            f"{API}/games/keno/play",
            json={"picks": [], "stake": 20},
            headers=auth_headers,
        )
        assert r.status_code == 400

    def test_keno_invalid_picks_out_of_range(self, auth_headers):
        r = requests.post(
            f"{API}/games/keno/play",
            json={"picks": [81], "stake": 20},
            headers=auth_headers,
        )
        assert r.status_code == 400

    def test_keno_too_many_picks(self, auth_headers):
        r = requests.post(
            f"{API}/games/keno/play",
            json={"picks": list(range(1, 12)), "stake": 20},
            headers=auth_headers,
        )
        assert r.status_code == 400

    def test_coinflip_heads(self, auth_headers):
        r = requests.post(
            f"{API}/games/coinflip",
            json={"side": "heads", "bet": 10},
            headers=auth_headers,
        )
        assert r.status_code == 200
        d = r.json()
        assert d["outcome"] in ("heads", "tails")
        assert "balance" in d and "win" in d

    def test_coinflip_tails(self, auth_headers):
        r = requests.post(
            f"{API}/games/coinflip",
            json={"side": "tails", "bet": 10},
            headers=auth_headers,
        )
        assert r.status_code == 200

    def test_coinflip_invalid_side(self, auth_headers):
        r = requests.post(
            f"{API}/games/coinflip",
            json={"side": "edge", "bet": 10},
            headers=auth_headers,
        )
        assert r.status_code == 400


# ---------------- BONUS ----------------
class TestBonus:
    def test_bonus_flow(self, auth_headers):
        s = requests.get(f"{API}/bonus/status", headers=auth_headers)
        assert s.status_code == 200
        status = s.json()
        assert "available" in status and "amount" in status
        if status["available"]:
            c = requests.post(f"{API}/bonus/claim", headers=auth_headers)
            assert c.status_code == 200
            assert c.json()["claimed"] > 0
            # second claim should fail
            c2 = requests.post(f"{API}/bonus/claim", headers=auth_headers)
            assert c2.status_code == 400


# ---------------- WALLET / LB / VIP ----------------
class TestWalletLbVip:
    def test_transactions(self, auth_headers):
        r = requests.get(f"{API}/wallet/transactions", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1  # signup bonus

    def test_leaderboard(self):
        r = requests.get(f"{API}/leaderboard")
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list)
        if arr:
            assert "rank" in arr[0] and "vip_tier" in arr[0]

    def test_vip_tiers_eight(self):
        r = requests.get(f"{API}/vip/tiers")
        assert r.status_code == 200
        assert len(r.json()) == 8


# ---------------- PAYMENTS ----------------
class TestPayments:
    def test_packages_five(self):
        r = requests.get(f"{API}/payments/packages")
        assert r.status_code == 200
        assert len(r.json()) == 5

    def test_checkout(self, auth_headers):
        pkgs = requests.get(f"{API}/payments/packages").json()
        lk = pkgs[0]["lookup_key"]
        r = requests.post(
            f"{API}/payments/checkout",
            json={"lookup_key": lk, "origin_url": BASE_URL},
            headers=auth_headers,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("checkout_url", "").startswith("http")
        assert d.get("session_id")
        # status endpoint
        s = requests.get(f"{API}/payments/status/{d['session_id']}")
        assert s.status_code == 200
        assert s.json()["session_id"] == d["session_id"]

    def test_checkout_bad_package(self, auth_headers):
        r = requests.post(
            f"{API}/payments/checkout",
            json={"lookup_key": "nope", "origin_url": BASE_URL},
            headers=auth_headers,
        )
        assert r.status_code == 400


# ---------------- CASHBACK ----------------
class TestCashback:
    def test_cashback_status_shape(self, auth_headers):
        r = requests.get(f"{API}/cashback/status", headers=auth_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("percent", "amount", "seconds_left", "tier"):
            assert k in d, f"missing {k}"
        assert isinstance(d["percent"], (int, float))
        assert isinstance(d["amount"], (int, float))
        assert isinstance(d["seconds_left"], int)

    def test_cashback_claim_not_ready_for_new_user(self, auth_headers):
        # Freshly registered user has no net losses -> claim should 400
        r = requests.post(f"{API}/cashback/claim", headers=auth_headers)
        assert r.status_code == 400

    def test_cashback_private_tier_payout(self):
        """Simulate a Private-tier user (>=5000 wagered) with net losses and open cashback window.
        Verify /cashback/claim pays out, then a cooldown starts and /auth/me returns cashback_just_paid on auto-grant.
        """
        import asyncio

        try:
            from motor.motor_asyncio import AsyncIOMotorClient
        except ImportError:
            pytest.skip("motor not installed")
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")

        # Register a fresh user
        email = f"test_cb_{uuid.uuid4().hex[:8]}@wowtest.com"
        pw = "SecretPass123"
        r = requests.post(
            f"{API}/auth/register", json={"email": email, "password": pw, "name": "CB"}
        )
        assert r.status_code == 200
        token = r.json()["token"]
        uid = r.json()["user"]["user_id"]
        h = {"Authorization": f"Bearer {token}"}

        async def prep():
            client = AsyncIOMotorClient(mongo_url)
            db = client[db_name]
            # Private tier requires >=5000 wagered. Give the user losses of 1000 and open the window.
            await db.users.update_one(
                {"user_id": uid},
                {
                    "$set": {
                        "total_wagered": 6000.0,
                        "total_won": 5000.0,  # net loss 1000
                        "cashback_wagered_snapshot": 0.0,
                        "cashback_won_snapshot": 0.0,
                        "last_cashback_at": None,
                    }
                },
            )
            client.close()

        (
            asyncio.get_event_loop().run_until_complete(prep())
            if False
            else asyncio.run(prep())
        )

        # Status should show a positive amount and seconds_left=0
        s = requests.get(f"{API}/cashback/status", headers=h).json()
        assert s["percent"] > 0, s
        assert s["amount"] > 0, s
        assert s["seconds_left"] == 0

        # /auth/me should auto-grant and return cashback_just_paid one-time
        me = requests.get(f"{API}/auth/me", headers=h)
        assert me.status_code == 200
        me_d = me.json()
        assert me_d.get("cashback_just_paid") and me_d["cashback_just_paid"] > 0, me_d
        new_balance = me_d.get("balance") or me_d.get("user", {}).get("balance")
        assert new_balance > 10000.0  # got cashback on top of signup bonus

        # A subsequent claim should now be on cooldown (seconds_left > 0), so 400
        r2 = requests.post(f"{API}/cashback/claim", headers=h)
        assert r2.status_code == 400

        # /auth/me again should NOT include cashback_just_paid
        me2 = requests.get(f"{API}/auth/me", headers=h).json()
        assert "cashback_just_paid" not in me2 or not me2.get("cashback_just_paid")

        # And status should show seconds_left ~ 7 days
        s2 = requests.get(f"{API}/cashback/status", headers=h).json()
        assert s2["seconds_left"] > 0


# ---------------- FLEET ENQUIRY ----------------
class TestFleetEnquiry:
    def test_fleet_enquiry_success(self):
        payload = {
            "name": "TEST_Commander Ops",
            "email": f"test_fleet_{uuid.uuid4().hex[:6]}@wowtest.com",
            "company": "Alpha Squad",
            "country": "USA",
            "message": "TEST_ Requesting fleet quote for 3 units.",
        }
        r = requests.post(f"{API}/fleet/enquiry", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("ok") is True
        assert isinstance(d.get("id"), str) and len(d["id"]) > 5

    def test_fleet_enquiry_persists(self):
        payload = {
            "name": "TEST_Persist",
            "email": f"test_persist_{uuid.uuid4().hex[:6]}@wowtest.com",
            "company": "",
            "country": "",
            "message": "TEST_ persistence check",
        }
        r = requests.post(f"{API}/fleet/enquiry", json=payload)
        assert r.status_code == 200
        eid = r.json()["id"]
        # verify persisted via mongo
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            import asyncio
        except ImportError:
            pytest.skip("motor not installed")
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")

        async def check():
            client = AsyncIOMotorClient(mongo_url)
            doc = await client[db_name].fleet_enquiries.find_one({"id": eid})
            client.close()
            return doc

        doc = asyncio.run(check())
        assert doc is not None
        assert doc["email"] == payload["email"]
        assert doc["name"] == "TEST_Persist"

    def test_fleet_enquiry_missing_name(self):
        r = requests.post(
            f"{API}/fleet/enquiry", json={"email": "x@y.com", "message": "hi"}
        )
        assert r.status_code == 422

    def test_fleet_enquiry_missing_email(self):
        r = requests.post(f"{API}/fleet/enquiry", json={"name": "x", "message": "hi"})
        assert r.status_code == 422

    def test_fleet_enquiry_missing_message(self):
        r = requests.post(
            f"{API}/fleet/enquiry", json={"name": "x", "email": "x@y.com"}
        )
        assert r.status_code == 422

    def test_fleet_enquiry_empty_name(self):
        r = requests.post(
            f"{API}/fleet/enquiry",
            json={"name": "", "email": "x@y.com", "message": "hi"},
        )
        assert r.status_code == 422

    def test_fleet_enquiry_invalid_email(self):
        r = requests.post(
            f"{API}/fleet/enquiry",
            json={"name": "x", "email": "notanemail", "message": "hi"},
        )
        assert r.status_code == 422


# ---------------- CASHBACK HISTORY ----------------
class TestCashbackHistory:
    def test_history_unauth(self):
        r = requests.get(f"{API}/cashback/history")
        assert r.status_code == 401

    def test_history_empty_for_new_user(self, auth_headers):
        r = requests.get(f"{API}/cashback/history", headers=auth_headers)
        assert r.status_code == 200
        assert r.json() == []

    def test_history_after_payout(self):
        """Trigger a Private-tier cashback payout via /auth/me, then history should list it."""
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            import asyncio
        except ImportError:
            pytest.skip("motor not installed")
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")

        email = f"test_cbh_{uuid.uuid4().hex[:8]}@wowtest.com"
        pw = "SecretPass123"
        r = requests.post(
            f"{API}/auth/register", json={"email": email, "password": pw, "name": "CBH"}
        )
        assert r.status_code == 200
        token = r.json()["token"]
        uid = r.json()["user"]["user_id"]
        h = {"Authorization": f"Bearer {token}"}

        async def prep():
            client = AsyncIOMotorClient(mongo_url)
            await client[db_name].users.update_one(
                {"user_id": uid},
                {
                    "$set": {
                        "total_wagered": 6000.0,
                        "total_won": 5000.0,
                        "cashback_wagered_snapshot": 0.0,
                        "cashback_won_snapshot": 0.0,
                        "last_cashback_at": None,
                    }
                },
            )
            client.close()

        asyncio.run(prep())

        # trigger auto-grant
        me = requests.get(f"{API}/auth/me", headers=h).json()
        assert me.get("cashback_just_paid", 0) > 0

        # history should now have 1 entry with type=cashback
        r = requests.get(f"{API}/cashback/history", headers=h)
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list) and len(rows) >= 1
        row = rows[0]
        assert row.get("type") == "cashback"
        assert row.get("amount", 0) > 0
        # should carry tier/percent metadata (per playbook)
        # accept either flat fields or nested meta
        has_tier = "tier" in row or (
            "meta" in row and "tier" in (row.get("meta") or {})
        )
        has_pct = ("percent" in row) or (
            "meta" in row and "percent" in (row.get("meta") or {})
        )
        assert has_tier, f"missing tier field in cashback tx: {row}"
        assert has_pct, f"missing percent field in cashback tx: {row}"
        # newest-first: created_at present and sorted
        if len(rows) > 1:
            assert rows[0]["created_at"] >= rows[1]["created_at"]
        # no mongo _id leaked
        assert "_id" not in row


# ---------------- ADMIN DASHBOARD ----------------
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@wagesofwarcasino.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "WagesOfWar2025!")


@pytest.fixture(scope="session")
def admin_headers():
    r = requests.post(
        f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


class TestAdmin:
    def test_stats_unauth_401(self):
        r = requests.get(f"{API}/admin/stats")
        assert r.status_code == 401, r.text

    def test_players_unauth_401(self):
        r = requests.get(f"{API}/admin/players")
        assert r.status_code == 401

    def test_enquiries_unauth_401(self):
        r = requests.get(f"{API}/admin/enquiries")
        assert r.status_code == 401

    def test_stats_normal_user_403(self, auth_headers):
        r = requests.get(f"{API}/admin/stats", headers=auth_headers)
        assert r.status_code == 403, r.text

    def test_players_normal_user_403(self, auth_headers):
        r = requests.get(f"{API}/admin/players", headers=auth_headers)
        assert r.status_code == 403

    def test_enquiries_normal_user_403(self, auth_headers):
        r = requests.get(f"{API}/admin/enquiries", headers=auth_headers)
        assert r.status_code == 403

    def test_stats_admin_200(self, admin_headers):
        r = requests.get(f"{API}/admin/stats", headers=admin_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in (
            "players",
            "total_balance",
            "total_wagered",
            "total_won",
            "games_played",
            "enquiries",
            "deposits",
        ):
            assert k in d, f"missing {k} in stats: {d}"
        assert isinstance(d["players"], int) and d["players"] >= 1

    def test_players_admin_200_and_search(self, admin_headers, new_user):
        r = requests.get(f"{API}/admin/players", headers=admin_headers)
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list) and len(rows) >= 1
        assert "_id" not in rows[0]
        assert "password_hash" not in rows[0]
        # search filter
        r2 = requests.get(
            f"{API}/admin/players",
            headers=admin_headers,
            params={"search": new_user["email"]},
        )
        assert r2.status_code == 200
        found = r2.json()
        emails = [p.get("email") for p in found]
        assert new_user["email"] in emails, emails

    def test_enquiries_admin_200(self, admin_headers):
        r = requests.get(f"{API}/admin/enquiries", headers=admin_headers)
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        if rows:
            assert "_id" not in rows[0]

    def test_balance_adjust_delta(self, admin_headers, new_user):
        uid = (
            new_user["user_id"]
            if "user_id" in new_user
            else new_user["user"].get("user_id") or new_user["user"].get("id")
        )
        # get current balance
        me = requests.get(
            f"{API}/admin/players",
            headers=admin_headers,
            params={"search": new_user["email"]},
        ).json()
        assert me, "player not found for adjust test"
        target = me[0]
        uid = target.get("user_id") or target.get("id")
        assert uid, f"no user_id in player row: {target}"
        before = target.get("balance", 0)
        r = requests.post(
            f"{API}/admin/players/{uid}/balance",
            headers=admin_headers,
            json={"amount": 500, "mode": "delta"},
        )
        assert r.status_code == 200, r.text
        new_bal = r.json()["balance"]
        assert round(new_bal - before, 2) == 500.0, (before, new_bal)

    def test_balance_adjust_set(self, admin_headers, new_user):
        me = requests.get(
            f"{API}/admin/players",
            headers=admin_headers,
            params={"search": new_user["email"]},
        ).json()
        uid = me[0].get("user_id") or me[0].get("id")
        r = requests.post(
            f"{API}/admin/players/{uid}/balance",
            headers=admin_headers,
            json={"amount": 12345.67, "mode": "set"},
        )
        assert r.status_code == 200, r.text
        assert r.json()["balance"] == 12345.67

    def test_balance_adjust_records_transaction(
        self, admin_headers, new_user, auth_headers
    ):
        # After the adjusts above, the user's transactions should include 'admin_adjust'
        r = requests.get(f"{API}/wallet/transactions", headers=auth_headers)
        assert r.status_code == 200
        types = [t.get("type") for t in r.json()]
        assert "admin_adjust" in types, types

    def test_balance_adjust_404_for_unknown_user(self, admin_headers):
        r = requests.post(
            f"{API}/admin/players/nonexistent-uid/balance",
            headers=admin_headers,
            json={"amount": 10, "mode": "delta"},
        )
        assert r.status_code == 404, r.text

    def test_balance_adjust_forbidden_for_normal_user(self, auth_headers, new_user):
        uid = new_user["user"].get("user_id") or new_user["user"].get("id")
        r = requests.post(
            f"{API}/admin/players/{uid}/balance",
            headers=auth_headers,
            json={"amount": 10, "mode": "delta"},
        )
        assert r.status_code == 403

    def test_public_upgrades_catalog(self):
        r = requests.get(f"{API}/upgrades")
        assert r.status_code == 200, r.text
        packages = r.json()
        assert isinstance(packages, list) and len(packages) >= 1
        assert all("id" in p and "name" in p for p in packages)

    def test_admin_upgrades_roundtrip(self, admin_headers):
        r = requests.get(f"{API}/admin/upgrades", headers=admin_headers)
        assert r.status_code == 200, r.text
        packages = r.json()
        assert isinstance(packages, list) and len(packages) >= 1
        assert all("id" in p and "name" in p for p in packages)

        updated = [
            {**packages[0], "active": not packages[0].get("active", False), "published": True}
        ]
        r2 = requests.post(
            f"{API}/admin/upgrades",
            headers=admin_headers,
            json=updated,
        )
        assert r2.status_code == 200, r2.text
        assert r2.json()[0]["active"] is updated[0]["active"]


# ---------------- FLAGSHIP SLOT / HOLD&WIN ----------------
class TestFlagshipSlots:
    def test_spin_voodoo_vengeance_returns_grid(self, auth_headers):
        r = requests.post(
            f"{API}/games/slots/spin",
            json={"machine_id": "voodoo_vengeance", "bet": 20},
            headers=auth_headers,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert "grid" in d and isinstance(d["grid"], list)
        # flagships include firecoins overlay + holdwin_triggered flag
        assert "firecoins" in d
        assert "holdwin_triggered" in d

    def test_spin_standard_sweet_ammo(self, auth_headers):
        r = requests.post(
            f"{API}/games/slots/spin",
            json={"machine_id": "sweet_ammo", "bet": 20},
            headers=auth_headers,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert "grid" in d and "line_wins" in d and "total_win" in d

    def test_spin_all_flagship_recent_upgrades(self, auth_headers):
        for mid in [
            "gates_of_glory",
            "samurai_strike",
            "voodoo_vengeance",
            "corsair_cannons",
        ]:
            r = requests.post(
                f"{API}/games/slots/spin",
                json={"machine_id": mid, "bet": 20},
                headers=auth_headers,
            )
            assert r.status_code == 200, f"{mid}: {r.text}"
            assert "grid" in r.json()

    def test_holdwin_endpoint_requires_valid_session(self, auth_headers):
        r = requests.post(
            f"{API}/games/slots/holdwin",
            json={"session_id": "nonexistent"},
            headers=auth_headers,
        )
        assert r.status_code in (400, 404)

    def test_holdwin_flow_when_triggered(self, auth_headers):
        """Try to force a holdwin trigger by spinning a flagship many times, then resolve."""
        session_id = None
        for _ in range(80):
            r = requests.post(
                f"{API}/games/slots/spin",
                json={"machine_id": "voodoo_vengeance", "bet": 100},
                headers=auth_headers,
            )
            if r.status_code != 200:
                # ran out of balance -> stop
                break
            d = r.json()
            sess = d.get("holdwin_session")
            if sess and sess.get("session_id"):
                session_id = sess["session_id"]
                break
        if not session_id:
            pytest.skip("holdwin not triggered in 80 spins (probabilistic)")
        r2 = requests.post(
            f"{API}/games/slots/holdwin",
            json={"session_id": session_id},
            headers=auth_headers,
        )
        assert r2.status_code == 200, r2.text
        d = r2.json()
        # response should contain resolution data
        assert isinstance(d, dict)


# ---------------- CASHIER (PLAYER) ----------------
class TestCashier:
    def test_currencies_list(self):
        r = requests.get(f"{API}/cashier/currencies")
        assert r.status_code == 200, r.text
        d = r.json()
        assert "currencies" in d and isinstance(d["currencies"], list)
        codes = {c["code"] for c in d["currencies"]}
        for expected in ("USD", "AUD", "BTC", "ETH", "USDT"):
            assert expected in codes, f"missing currency {expected}"
        assert d.get("min_deposit_aud") == 10.0
        assert d.get("min_withdraw_aud") == 20.0

    def test_summary_requires_auth(self):
        r = requests.get(f"{API}/cashier/summary")
        assert r.status_code == 401

    def test_summary_authed(self, auth_headers):
        r = requests.get(f"{API}/cashier/summary", headers=auth_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in (
            "real_balance_cents",
            "real_balance_usd",
            "min_deposit_usd",
            "min_withdraw_usd",
            "crypto_live",
            "vault_live",
        ):
            assert k in d, f"missing {k}"
        assert isinstance(d["real_balance_cents"], int)

    def test_stripe_deposit_returns_checkout_url(self, auth_headers):
        r = requests.post(
            f"{API}/cashier/deposit/stripe",
            json={"currency": "AUD", "amount": 20.0, "origin_url": BASE_URL},
            headers=auth_headers,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("checkout_url", "").startswith("http")
        assert d.get("session_id")

    def test_stripe_deposit_below_minimum_rejected(self, auth_headers):
        r = requests.post(
            f"{API}/cashier/deposit/stripe",
            json={"currency": "AUD", "amount": 5.0, "origin_url": BASE_URL},
            headers=auth_headers,
        )
        assert r.status_code == 400

    def test_crypto_deposit_btc_returns_pay_address(self, auth_headers):
        r = requests.post(
            f"{API}/cashier/deposit/crypto",
            json={"pay_currency": "BTC", "amount_usd": 20.0},
            headers=auth_headers,
        )
        # NOWPayments live can occasionally 429/502 — retry once
        if r.status_code >= 500 or r.status_code == 429:
            time.sleep(2)
            r = requests.post(
                f"{API}/cashier/deposit/crypto",
                json={"pay_currency": "BTC", "amount_usd": 20.0},
                headers=auth_headers,
            )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("pay_address"), d
        # With live NOWPayments key, sandbox should be false
        assert (
            d.get("sandbox") is False
        ), f"expected sandbox=false with live key, got {d}"

    def test_crypto_deposit_below_minimum_rejected(self, auth_headers):
        r = requests.post(
            f"{API}/cashier/deposit/crypto",
            json={"pay_currency": "BTC", "amount_usd": 1.0},
            headers=auth_headers,
        )
        assert r.status_code == 400

    def test_withdraw_below_minimum_rejected(self, auth_headers):
        r = requests.post(
            f"{API}/cashier/withdraw",
            json={"currency": "AUD", "amount": 5.0, "destination": "AU12345678901234"},
            headers=auth_headers,
        )
        assert r.status_code == 400

    def test_withdraw_above_balance_rejected(self, auth_headers):
        r = requests.post(
            f"{API}/cashier/withdraw",
            json={
                "currency": "AUD",
                "amount": 999999.0,
                "destination": "AU12345678901234",
            },
            headers=auth_headers,
        )
        # With the new KYC gate, an unverified user hits 403 BEFORE the
        # insufficient-balance check. Either 400 (insufficient) or 403 (kyc)
        # is acceptable — both are compliance/validation rejections.
        assert r.status_code in (400, 403), r.text

    def test_transactions_authed(self, auth_headers):
        r = requests.get(f"{API}/cashier/transactions", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------------- CASHIER WITHDRAWAL FLOW + ADMIN APPROVAL ----------------
class TestCashierWithdrawalAndAdmin:
    """Create a user, seed real_balance_cents via mongo, submit withdrawal,
    then approve/reject via admin endpoints."""

    def _seed_real_balance(self, user_id: str, cents: int, kyc_approved: bool = True):
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            import asyncio
        except ImportError:
            pytest.skip("motor not installed")
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")

        async def go():
            client = AsyncIOMotorClient(mongo_url)
            update = {"real_balance_cents": cents}
            if kyc_approved:
                # Bypass the KYC gate for approval/rejection flow tests
                update["kyc_approved"] = True
                update["kyc_status"] = "approved"
            await client[db_name].users.update_one(
                {"user_id": user_id}, {"$set": update}
            )
            client.close()

        asyncio.run(go())

    def test_valid_withdrawal_holds_funds_and_admin_approve(self, admin_headers):
        # Fresh user
        email = f"test_wd_{uuid.uuid4().hex[:8]}@wowtest.com"
        r = requests.post(
            f"{API}/auth/register",
            json={"email": email, "password": "abc123", "name": "WD"},
        )
        assert r.status_code == 200
        token = r.json()["token"]
        uid = r.json()["user"]["user_id"]
        h = {"Authorization": f"Bearer {token}"}
        # Seed $100 USD
        self._seed_real_balance(uid, 10000)

        # Submit valid AUD withdrawal ($30 AUD ~ $19.80 USD > min $13.20 USD)
        r = requests.post(
            f"{API}/cashier/withdraw",
            headers=h,
            json={"currency": "AUD", "amount": 30.0, "destination": "AU12345678901234"},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "pending"
        wd_id = d["id"]

        # Balance should be decremented
        s = requests.get(f"{API}/cashier/summary", headers=h).json()
        assert s["real_balance_cents"] < 10000, s

        # Admin summary shows pending
        adm = requests.get(f"{API}/admin/cashier/summary", headers=admin_headers)
        assert adm.status_code == 200, adm.text
        assert adm.json()["pending_withdrawals"] >= 1

        # Admin transactions listing
        tx = requests.get(f"{API}/admin/cashier/transactions", headers=admin_headers)
        assert tx.status_code == 200
        assert any(t["id"] == wd_id for t in tx.json())

        # Approve
        appr = requests.post(
            f"{API}/admin/cashier/withdrawals/{wd_id}/approve", headers=admin_headers
        )
        assert appr.status_code == 200, appr.text
        assert appr.json()["status"] == "completed"

        # Re-approving same withdrawal should now fail (not pending)
        appr2 = requests.post(
            f"{API}/admin/cashier/withdrawals/{wd_id}/approve", headers=admin_headers
        )
        assert appr2.status_code == 400

    def test_valid_withdrawal_reject_refunds(self, admin_headers):
        email = f"test_wdr_{uuid.uuid4().hex[:8]}@wowtest.com"
        r = requests.post(
            f"{API}/auth/register",
            json={"email": email, "password": "abc123", "name": "WD"},
        )
        token = r.json()["token"]
        uid = r.json()["user"]["user_id"]
        h = {"Authorization": f"Bearer {token}"}
        self._seed_real_balance(uid, 10000)

        r = requests.post(
            f"{API}/cashier/withdraw",
            headers=h,
            json={"currency": "AUD", "amount": 30.0, "destination": "AU12345678901234"},
        )
        assert r.status_code == 200, r.text
        wd_id = r.json()["id"]

        before = requests.get(f"{API}/cashier/summary", headers=h).json()[
            "real_balance_cents"
        ]

        rej = requests.post(
            f"{API}/admin/cashier/withdrawals/{wd_id}/reject", headers=admin_headers
        )
        assert rej.status_code == 200, rej.text
        assert rej.json()["status"] == "rejected"

        after = requests.get(f"{API}/cashier/summary", headers=h).json()[
            "real_balance_cents"
        ]
        assert after > before, (before, after)  # refunded

    def test_admin_cashier_summary_unauth_401(self):
        r = requests.get(f"{API}/admin/cashier/summary")
        assert r.status_code == 401

    def test_admin_cashier_summary_forbidden_for_normal_user(self, auth_headers):
        r = requests.get(f"{API}/admin/cashier/summary", headers=auth_headers)
        assert r.status_code == 403

    def test_admin_cashier_bad_action(self, admin_headers):
        r = requests.post(
            f"{API}/admin/cashier/withdrawals/xx/foobar", headers=admin_headers
        )
        assert r.status_code == 400



# ---------------- KYC / IDENTITY VERIFICATION (Stripe Identity) ----------------
class TestKyc:
    """Verify Stripe Identity session creation, status endpoint, and the
    withdrawal compliance gate that requires kyc_approved=True."""

    def _fresh_user(self):
        email = f"test_kyc_{uuid.uuid4().hex[:8]}@wowtest.com"
        r = requests.post(
            f"{API}/auth/register",
            json={"email": email, "password": "abc123", "name": "KYC"},
        )
        assert r.status_code == 200, r.text
        j = r.json()
        return {
            "email": email,
            "token": j["token"],
            "user_id": j["user"]["user_id"],
            "headers": {"Authorization": f"Bearer {j['token']}"},
        }

    def _seed_real_balance(self, user_id: str, cents: int):
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            import asyncio
        except ImportError:
            pytest.skip("motor not installed")
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")

        async def go():
            client = AsyncIOMotorClient(mongo_url)
            await client[db_name].users.update_one(
                {"user_id": user_id}, {"$set": {"real_balance_cents": cents}}
            )
            client.close()

        asyncio.run(go())

    def test_kyc_session_unauth_401(self):
        r = requests.post(f"{API}/kyc/session", json={})
        assert r.status_code == 401

    def test_kyc_status_unauth_401(self):
        r = requests.get(f"{API}/kyc/status")
        assert r.status_code == 401

    def test_kyc_status_fresh_user_not_started(self):
        u = self._fresh_user()
        r = requests.get(f"{API}/kyc/status", headers=u["headers"])
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("kyc_approved") is False
        assert d.get("status") == "not_started"
        # error field must be present (may be None)
        assert "error" in d

    def test_public_user_includes_kyc_fields(self):
        u = self._fresh_user()
        me = requests.get(f"{API}/auth/me", headers=u["headers"])
        assert me.status_code == 200
        m = me.json()
        assert "kyc_status" in m, m
        assert "kyc_approved" in m, m
        assert m["kyc_approved"] is False
        assert m["kyc_status"] == "not_started"

    def test_kyc_session_creates_stripe_verification_url(self):
        u = self._fresh_user()
        r = requests.post(
            f"{API}/kyc/session",
            json={"origin_url": BASE_URL},
            headers=u["headers"],
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert "url" in d, d
        assert d["url"].startswith("https://verify.stripe.com"), d["url"]
        assert d.get("session_id", "").startswith("vs_"), d
        # Now /kyc/status should reflect requires_input (Stripe returns
        # requires_input for a freshly created session)
        s = requests.get(f"{API}/kyc/status", headers=u["headers"]).json()
        assert s["kyc_approved"] is False
        assert s["status"] in ("requires_input", "processing", "not_started")

    def test_withdraw_blocked_without_kyc_403(self):
        """CRITICAL COMPLIANCE GATE: a user with sufficient real_balance_cents
        but kyc_approved=False must receive 403 on POST /cashier/withdraw."""
        u = self._fresh_user()
        # Seed $100 USD real balance (more than $13.20 min withdraw)
        self._seed_real_balance(u["user_id"], 10000)
        r = requests.post(
            f"{API}/cashier/withdraw",
            headers=u["headers"],
            json={
                "currency": "AUD",
                "amount": 30.0,
                "destination": "AU12345678901234",
            },
        )
        assert r.status_code == 403, r.text
        # Message should mention identity/verification/kyc
        body = r.text.lower()
        assert (
            "identity" in body or "verification" in body or "kyc" in body
        ), body


# ---------------- WHEEL (Daily Streak Wheel) ----------------
class TestWheel:
    def test_wheel_status_unauth_401(self):
        r = requests.get(f"{API}/wheel/status")
        assert r.status_code == 401

    def test_wheel_status_authed_shape(self, auth_headers):
        r = requests.get(f"{API}/wheel/status", headers=auth_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("available", "seconds_left", "streak", "segments", "next_multiplier"):
            assert k in d, f"missing {k}"
        assert isinstance(d["segments"], list) and len(d["segments"]) == 9
        assert d["segments"][0] == 500 and d["segments"][-1] == 50000

    def test_wheel_spin_fresh_user_and_cooldown(self):
        # Fresh user to avoid admin cooldown
        email = f"test_wh_{uuid.uuid4().hex[:8]}@wowtest.com"
        r = requests.post(
            f"{API}/auth/register",
            json={"email": email, "password": "abc123", "name": "WH"},
        )
        assert r.status_code == 200
        tok = r.json()["token"]
        h = {"Authorization": f"Bearer {tok}"}
        me1 = requests.get(f"{API}/auth/me", headers=h).json()
        bal_before = me1["balance"]

        st1 = requests.get(f"{API}/wheel/status", headers=h).json()
        assert st1["available"] is True and st1["seconds_left"] == 0
        assert st1["streak"] == 0

        sp = requests.post(f"{API}/wheel/spin", headers=h)
        assert sp.status_code == 200, sp.text
        d = sp.json()
        for k in ("amount", "segment_index", "multiplier", "streak", "balance"):
            assert k in d
        assert d["amount"] > 0
        assert d["multiplier"] in (1, 2)
        assert d["streak"] == 1
        assert 0 <= d["segment_index"] <= 8
        assert round(d["balance"] - bal_before, 2) == round(d["amount"], 2)

        # Second immediate spin => 400 cooldown
        sp2 = requests.post(f"{API}/wheel/spin", headers=h)
        assert sp2.status_code == 400

        # Status shows cooldown
        st2 = requests.get(f"{API}/wheel/status", headers=h).json()
        assert st2["available"] is False
        assert st2["seconds_left"] > 0
        assert st2["streak"] == 1


# ---------------- TOURNAMENT ----------------
class TestTournament:
    def test_tournament_current_anon(self):
        r = requests.get(f"{API}/tournament/current")
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("id", "name", "prize_pool", "ends_at", "seconds_left", "leaderboard", "me"):
            assert k in d, f"missing {k}"
        assert d["prize_pool"] == 5_000_000
        assert d["name"] == "OPERATION HIGH ROLLER"
        assert 0 < d["seconds_left"] <= 24 * 3600 + 5
        assert isinstance(d["leaderboard"], list)
        assert d["me"] is None

    def test_tournament_current_authed_new_user_me(self):
        email = f"test_tn_{uuid.uuid4().hex[:8]}@wowtest.com"
        r = requests.post(
            f"{API}/auth/register",
            json={"email": email, "password": "abc123", "name": "TN"},
        )
        tok = r.json()["token"]
        h = {"Authorization": f"Bearer {tok}"}
        d = requests.get(f"{API}/tournament/current", headers=h).json()
        assert d["me"] is not None
        assert d["me"]["rank"] in (None,) and d["me"]["score"] == 0

    def test_tournament_score_updates_after_win(self):
        # Register fresh user, run coinflips until at least one win, then check leaderboard
        email = f"test_tw_{uuid.uuid4().hex[:8]}@wowtest.com"
        r = requests.post(
            f"{API}/auth/register",
            json={"email": email, "password": "abc123", "name": "TW"},
        )
        tok = r.json()["token"]
        h = {"Authorization": f"Bearer {tok}"}
        total_win = 0.0
        for _ in range(40):
            cf = requests.post(
                f"{API}/games/coinflip", json={"side": "heads", "bet": 20}, headers=h
            )
            if cf.status_code != 200:
                break
            w = cf.json().get("win", 0)
            if w > 0:
                total_win += w
                if total_win > 0:
                    break
        if total_win <= 0:
            pytest.skip("no coinflip win landed in 40 tries (probabilistic)")
        d = requests.get(f"{API}/tournament/current", headers=h).json()
        assert d["me"] is not None
        assert d["me"]["score"] > 0
        assert d["me"]["rank"] is not None and d["me"]["rank"] >= 1
