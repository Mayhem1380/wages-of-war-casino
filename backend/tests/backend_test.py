"""Wages of War Casino - Backend regression tests."""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].splitlines()[0]
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def new_user():
    email = f"test_{uuid.uuid4().hex[:10]}@wowtest.com"
    password = "SecretPass123"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": password, "name": "Test Op"})
    assert r.status_code == 200, r.text
    data = r.json()
    return {"email": email, "password": password, "token": data["token"], "user": data["user"]}


@pytest.fixture(scope="session")
def auth_headers(new_user):
    return {"Authorization": f"Bearer {new_user['token']}"}


# ---------------- AUTH ----------------
class TestAuth:
    def test_register_returns_10000_and_cookie(self):
        email = f"test_{uuid.uuid4().hex[:10]}@wowtest.com"
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "abc123", "name": "Rookie"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user"]["balance"] == 10000.0
        assert d["user"]["email"] == email
        assert "token" in d and len(d["token"]) > 20
        # Cookie
        assert "access_token" in r.cookies or any("access_token" in h for h in r.headers.get("set-cookie", "").split(","))

    def test_register_duplicate_email(self, new_user):
        r = requests.post(f"{API}/auth/register",
                          json={"email": new_user["email"], "password": "abc123", "name": "Dup"})
        assert r.status_code == 400

    def test_login_success(self, new_user):
        r = requests.post(f"{API}/auth/login", json={"email": new_user["email"], "password": new_user["password"]})
        assert r.status_code == 200
        assert "token" in r.json()

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": "nobody@test.com", "password": "wrong123"})
        assert r.status_code == 401

    def test_me_with_bearer(self, auth_headers, new_user):
        r = requests.get(f"{API}/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["email"] == new_user["email"]

    def test_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_admin_login(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": "admin@wagesofwarcasino.com", "password": "WagesOfWar2025!"})
        assert r.status_code == 200, r.text


# ---------------- SLOTS ----------------
class TestSlots:
    def test_list_slots_six_sorted(self):
        r = requests.get(f"{API}/games/slots")
        assert r.status_code == 200
        arr = r.json()
        assert len(arr) == 6
        pops = [m["popularity"] for m in arr]
        assert pops == sorted(pops, reverse=True)

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
        r = requests.post(f"{API}/games/slots/spin", json={"machine_id": mid, "bet": 20}, headers=auth_headers)
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
        r = requests.post(f"{API}/games/slots/spin", json={"machine_id": arr[0]["id"], "bet": 10}, headers=auth_headers)
        assert r.status_code == 400

    def test_spin_unauth(self):
        arr = requests.get(f"{API}/games/slots").json()
        r = requests.post(f"{API}/games/slots/spin", json={"machine_id": arr[0]["id"], "bet": 20})
        assert r.status_code == 401

    def test_spin_insufficient(self, auth_headers):
        arr = requests.get(f"{API}/games/slots").json()
        r = requests.post(f"{API}/games/slots/spin", json={"machine_id": arr[0]["id"], "bet": 99999999}, headers=auth_headers)
        assert r.status_code == 400


# ---------------- KENO / COINFLIP ----------------
class TestKenoCoinflip:
    def test_keno_play(self, auth_headers):
        r = requests.post(f"{API}/games/keno/play", json={"picks": [1, 5, 10, 20, 40], "stake": 20}, headers=auth_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("hits", "multiplier", "win", "balance", "picks"):
            assert k in d
        assert len(d.get("drawn", d.get("draw", []))) == 20

    def test_keno_invalid_picks_zero(self, auth_headers):
        r = requests.post(f"{API}/games/keno/play", json={"picks": [], "stake": 20}, headers=auth_headers)
        assert r.status_code == 400

    def test_keno_invalid_picks_out_of_range(self, auth_headers):
        r = requests.post(f"{API}/games/keno/play", json={"picks": [81], "stake": 20}, headers=auth_headers)
        assert r.status_code == 400

    def test_keno_too_many_picks(self, auth_headers):
        r = requests.post(f"{API}/games/keno/play", json={"picks": list(range(1, 12)), "stake": 20}, headers=auth_headers)
        assert r.status_code == 400

    def test_coinflip_heads(self, auth_headers):
        r = requests.post(f"{API}/games/coinflip", json={"side": "heads", "bet": 10}, headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["outcome"] in ("heads", "tails")
        assert "balance" in d and "win" in d

    def test_coinflip_tails(self, auth_headers):
        r = requests.post(f"{API}/games/coinflip", json={"side": "tails", "bet": 10}, headers=auth_headers)
        assert r.status_code == 200

    def test_coinflip_invalid_side(self, auth_headers):
        r = requests.post(f"{API}/games/coinflip", json={"side": "edge", "bet": 10}, headers=auth_headers)
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
        r = requests.post(f"{API}/payments/checkout",
                          json={"lookup_key": lk, "origin_url": BASE_URL}, headers=auth_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("checkout_url", "").startswith("http")
        assert d.get("session_id")
        # status endpoint
        s = requests.get(f"{API}/payments/status/{d['session_id']}")
        assert s.status_code == 200
        assert s.json()["session_id"] == d["session_id"]

    def test_checkout_bad_package(self, auth_headers):
        r = requests.post(f"{API}/payments/checkout",
                          json={"lookup_key": "nope", "origin_url": BASE_URL}, headers=auth_headers)
        assert r.status_code == 400
