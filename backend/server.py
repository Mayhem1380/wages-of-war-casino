from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import logging
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
import bcrypt
import jwt
import secrets
import urllib.request
import json
from datetime import datetime, timezone, timedelta

import stripe

from games import (
    SLOT_MACHINES, spin_slot, play_keno, KENO_PAYTABLE, PAYLINES,
    VIP_TIERS, tier_for_wagered, CREDIT_PACKAGES,
)

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY") or "sk_test_emergent"
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
TAX_MODE = "full"  # US + digital credits -> Stripe managed payments

STARTING_BALANCE = 10000.0
DAILY_BONUS_COOLDOWN_HOURS = 24
CASHBACK_COOLDOWN_HOURS = 168  # weekly

app = FastAPI(title="Wages of War Casino API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("wagesofwar")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(key="access_token", value=token, httponly=True, secure=True,
                        samesite="none", max_age=604800, path="/")


def public_user(u: dict) -> dict:
    wagered = u.get("total_wagered", 0.0)
    tier, nxt = tier_for_wagered(wagered)
    return {
        "user_id": u["user_id"],
        "email": u.get("email"),
        "name": u.get("name"),
        "picture": u.get("picture"),
        "role": u.get("role", "player"),
        "balance": round(u.get("balance", 0.0), 2),
        "total_wagered": round(wagered, 2),
        "total_won": round(u.get("total_won", 0.0), 2),
        "biggest_win": round(u.get("biggest_win", 0.0), 2),
        "games_played": u.get("games_played", 0),
        "vip_tier": tier["name"],
        "vip_rank": tier["rank"],
        "vip_cashback": tier["cashback"],
        "next_tier": nxt["name"] if nxt else None,
        "next_tier_at": nxt["min"] if nxt else None,
        "last_bonus_claim": u.get("last_bonus_claim"),
        "provider": u.get("provider", "email"),
        "created_at": u.get("created_at"),
    }


async def resolve_user(request: Request) -> Optional[dict]:
    token = request.cookies.get("access_token")
    session_token = request.cookies.get("session_token")
    if not token and not session_token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    # JWT path
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            u = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
            if u:
                return u
        except jwt.PyJWTError:
            pass
        # maybe it's a session token passed as bearer
        session_token = session_token or token
    # Google session path
    if session_token:
        sess = await db.user_sessions.find_one({"session_token": session_token})
        if sess:
            exp = sess["expires_at"]
            if isinstance(exp, str):
                exp = datetime.fromisoformat(exp)
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp >= datetime.now(timezone.utc):
                u = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
                if u:
                    return u
    return None


async def require_user(request: Request) -> dict:
    u = await resolve_user(request)
    if not u:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return u


async def adjust_balance(user_id: str, delta_balance: float, wagered: float = 0.0,
                         won: float = 0.0, biggest: float = None, played: int = 0):
    update = {"$inc": {"balance": delta_balance, "total_wagered": wagered,
                       "total_won": won, "games_played": played}}
    if biggest is not None:
        update["$max"] = {"biggest_win": biggest}
    await db.users.update_one({"user_id": user_id}, update)
    return await db.users.find_one({"user_id": user_id}, {"_id": 0})


async def record_transaction(user_id: str, ttype: str, amount: float, meta: dict = None):
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": ttype,
        "amount": round(amount, 2),
        "meta": meta or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


def _cashback_preview(user: dict):
    """Returns (percent, amount, seconds_left, tier_name) without granting."""
    tier, _ = tier_for_wagered(user.get("total_wagered", 0.0))
    pct = tier["cashback"]
    seconds_left = 0
    last = user.get("last_cashback_at")
    if last:
        ld = datetime.fromisoformat(last) if isinstance(last, str) else last
        if ld.tzinfo is None:
            ld = ld.replace(tzinfo=timezone.utc)
        elapsed = datetime.now(timezone.utc) - ld
        cooldown = timedelta(hours=CASHBACK_COOLDOWN_HOURS)
        if elapsed < cooldown:
            seconds_left = int((cooldown - elapsed).total_seconds())
    snap_w = user.get("cashback_wagered_snapshot", 0.0)
    snap_won = user.get("cashback_won_snapshot", 0.0)
    net_loss = (user.get("total_wagered", 0.0) - snap_w) - (user.get("total_won", 0.0) - snap_won)
    amount = round(max(0.0, net_loss) * pct / 100.0, 2)
    return pct, amount, seconds_left, tier["name"]


async def grant_cashback(user: dict):
    """Grant weekly cashback if cooldown elapsed and there is a positive amount.
    The window stays open until an actual (>0) payout is made, then a 7-day cooldown begins."""
    pct, amount, seconds_left, tier_name = _cashback_preview(user)
    if pct <= 0 or seconds_left > 0 or amount <= 0:
        return None
    now_iso = datetime.now(timezone.utc).isoformat()
    upd = {
        "last_cashback_at": now_iso,
        "cashback_wagered_snapshot": user.get("total_wagered", 0.0),
        "cashback_won_snapshot": user.get("total_won", 0.0),
    }
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": upd, "$inc": {"balance": amount}})
    await record_transaction(user["user_id"], "cashback", amount, {"tier": tier_name, "percent": pct})
    return amount


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class RegisterInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class SpinInput(BaseModel):
    machine_id: str
    bet: float = Field(gt=0)


class FreeSpinInput(BaseModel):
    session_id: str


class KenoInput(BaseModel):
    picks: List[int]
    stake: float = Field(gt=0)


class CoinFlipInput(BaseModel):
    side: str
    bet: float = Field(gt=0)


class CheckoutInput(BaseModel):
    lookup_key: str
    origin_url: str


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@api.post("/auth/register")
async def register(payload: RegisterInput, response: Response):
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "email": email,
        "name": payload.name.strip(),
        "password_hash": hash_password(payload.password),
        "role": "player",
        "provider": "email",
        "balance": STARTING_BALANCE,
        "total_wagered": 0.0,
        "total_won": 0.0,
        "biggest_win": 0.0,
        "games_played": 0,
        "last_bonus_claim": None,
        "last_cashback_at": datetime.now(timezone.utc).isoformat(),
        "cashback_wagered_snapshot": 0.0,
        "cashback_won_snapshot": 0.0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    await record_transaction(user_id, "signup_bonus", STARTING_BALANCE, {"note": "Welcome deployment credits"})
    token = create_access_token(user_id, email)
    set_auth_cookie(response, token)
    return {"user": public_user(doc), "token": token}


@api.post("/auth/login")
async def login(payload: LoginInput, response: Response):
    email = payload.email.lower().strip()
    u = await db.users.find_one({"email": email})
    if not u or not u.get("password_hash") or not verify_password(payload.password, u["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(u["user_id"], email)
    set_auth_cookie(response, token)
    return {"user": public_user(u), "token": token}


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(require_user)):
    granted = await grant_cashback(user)
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    resp = public_user(fresh)
    if granted:
        resp["cashback_just_paid"] = granted
    return resp


@api.get("/cashback/status")
async def cashback_status(user: dict = Depends(require_user)):
    pct, amount, seconds_left, tier_name = _cashback_preview(user)
    return {"available": pct > 0 and seconds_left == 0 and amount > 0,
            "amount": amount, "percent": pct, "seconds_left": seconds_left, "tier": tier_name}


@api.post("/cashback/claim")
async def cashback_claim(user: dict = Depends(require_user)):
    granted = await grant_cashback(user)
    if granted is None:
        raise HTTPException(status_code=400, detail="Weekly cashback not ready yet")
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"claimed": granted, "balance": round(fresh["balance"], 2)}


@api.post("/auth/session")
async def google_session(request: Request, response: Response):
    """Exchange Emergent OAuth session_id for a persistent session."""
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    req = urllib.request.Request(
        "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
        headers={"X-Session-ID": session_id},
    )
    try:
        with urllib.request.urlopen(req) as r:
            data = json.load(r)
    except Exception:
        raise HTTPException(status_code=401, detail="Failed to verify Google session")

    email = data["email"].lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id},
                                  {"$set": {"picture": data.get("picture"), "name": data.get("name") or existing.get("name")}})
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": data.get("name") or email.split("@")[0],
            "picture": data.get("picture"),
            "role": "player",
            "provider": "google",
            "balance": STARTING_BALANCE,
            "total_wagered": 0.0,
            "total_won": 0.0,
            "biggest_win": 0.0,
            "games_played": 0,
            "last_bonus_claim": None,
            "last_cashback_at": datetime.now(timezone.utc).isoformat(),
            "cashback_wagered_snapshot": 0.0,
            "cashback_won_snapshot": 0.0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user_doc)
        await record_transaction(user_id, "signup_bonus", STARTING_BALANCE, {"note": "Welcome deployment credits"})

    session_token = data.get("session_token") or secrets.token_urlsafe(32)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    response.set_cookie(key="session_token", value=session_token, httponly=True, secure=True,
                        samesite="none", max_age=604800, path="/")
    return {"user": public_user(user_doc)}


# ---------------------------------------------------------------------------
# Game metadata
# ---------------------------------------------------------------------------
@api.get("/games/slots")
async def list_slots():
    machines = sorted(SLOT_MACHINES.values(), key=lambda m: -m["popularity"])
    return [{
        "id": m["id"], "name": m["name"], "tagline": m["tagline"], "theme": m["theme"],
        "volatility": m["volatility"], "paylines": m["paylines"], "popularity": m["popularity"],
    } for m in machines]


@api.get("/games/slots/{machine_id}")
async def slot_detail(machine_id: str):
    m = SLOT_MACHINES.get(machine_id)
    if not m:
        raise HTTPException(status_code=404, detail="Machine not found")
    return {
        "id": m["id"], "name": m["name"], "tagline": m["tagline"], "theme": m["theme"],
        "volatility": m["volatility"], "paylines": m["paylines"], "reels": m["reels"], "rows": m["rows"],
        "symbols": list(m["symbols"].keys()), "wild": m["wild"], "scatter": m["scatter"],
        "paytable": m["paytable"], "scatter_pay": m["scatter_pay"], "free_spins": m["free_spins"],
    }


@api.post("/games/slots/spin")
async def slots_spin(payload: SpinInput, user: dict = Depends(require_user)):
    m = SLOT_MACHINES.get(payload.machine_id)
    if not m:
        raise HTTPException(status_code=404, detail="Machine not found")
    if payload.bet < 20:
        raise HTTPException(status_code=400, detail="Minimum bet is 20 credits")
    if payload.bet > 100000:
        raise HTTPException(status_code=400, detail="Maximum bet is 100,000 credits")
    if user.get("balance", 0) < payload.bet:
        raise HTTPException(status_code=400, detail="Insufficient credits")

    result = spin_slot(payload.machine_id, payload.bet)
    net = result["total_win"] - payload.bet
    updated = await adjust_balance(
        user["user_id"], delta_balance=net, wagered=payload.bet,
        won=result["total_win"], biggest=result["total_win"], played=1,
    )
    await record_transaction(user["user_id"], "slots", net,
                             {"machine": payload.machine_id, "bet": payload.bet, "win": result["total_win"]})

    # Free-spins trigger -> open an interactive session (winnings only, rising multiplier)
    free_session = None
    if result["free_spins_awarded"] > 0:
        session_id = str(uuid.uuid4())
        await db.free_spins.insert_one({
            "session_id": session_id,
            "user_id": user["user_id"],
            "machine_id": payload.machine_id,
            "bet": payload.bet,
            "spins_total": result["free_spins_awarded"],
            "spins_left": result["free_spins_awarded"],
            "multiplier": 1,
            "total_win": 0.0,
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        free_session = {"session_id": session_id, "spins_left": result["free_spins_awarded"], "multiplier": 1}

    result["free_session"] = free_session
    result["balance"] = round(updated["balance"], 2)
    result["net"] = round(net, 2)
    return result


@api.post("/games/slots/freespin")
async def slots_freespin(payload: FreeSpinInput, user: dict = Depends(require_user)):
    sess = await db.free_spins.find_one({"session_id": payload.session_id})
    if not sess or sess["user_id"] != user["user_id"] or not sess.get("active") or sess["spins_left"] <= 0:
        raise HTTPException(status_code=400, detail="No active free-spin session")

    result = spin_slot(sess["machine_id"], sess["bet"])
    multiplier = sess["multiplier"]
    base_win = result["total_win"]
    win = round(base_win * multiplier, 2)

    retrigger = result["scatter_count"] >= 3
    spins_left = sess["spins_left"] - 1
    if retrigger:
        spins_left += 5
    # multiplier climbs by 1 on every winning free spin
    next_multiplier = multiplier + (1 if base_win > 0 else 0)
    total_session_win = round(sess["total_win"] + win, 2)
    active = spins_left > 0

    await db.free_spins.update_one({"session_id": payload.session_id}, {"$set": {
        "spins_left": spins_left, "multiplier": next_multiplier,
        "total_win": total_session_win, "active": active,
    }})

    updated = await adjust_balance(user["user_id"], delta_balance=win, won=win, biggest=win, played=1)
    if win > 0:
        await record_transaction(user["user_id"], "free_spin", win,
                                 {"machine": sess["machine_id"], "multiplier": multiplier})

    result["base_win"] = round(base_win, 2)
    result["multiplier"] = multiplier
    result["win"] = win
    result["spins_left"] = spins_left
    result["next_multiplier"] = next_multiplier
    result["total_session_win"] = total_session_win
    result["active"] = active
    result["retrigger"] = retrigger
    result["balance"] = round(updated["balance"], 2)
    return result


# ---------------------------------------------------------------------------
# Keno
# ---------------------------------------------------------------------------
@api.get("/games/keno/paytable")
async def keno_paytable():
    return {"paytable": {str(k): v for k, v in KENO_PAYTABLE.items()}}


@api.post("/games/keno/play")
async def keno_play(payload: KenoInput, user: dict = Depends(require_user)):
    if payload.stake < 10:
        raise HTTPException(status_code=400, detail="Minimum stake is 10 credits")
    if user.get("balance", 0) < payload.stake:
        raise HTTPException(status_code=400, detail="Insufficient credits")
    try:
        result = play_keno(payload.picks, payload.stake)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    net = result["win"] - payload.stake
    updated = await adjust_balance(
        user["user_id"], delta_balance=net, wagered=payload.stake,
        won=result["win"], biggest=result["win"], played=1,
    )
    await record_transaction(user["user_id"], "keno", net,
                             {"picks": result["picks"], "stake": payload.stake, "win": result["win"]})
    result["balance"] = round(updated["balance"], 2)
    result["net"] = round(net, 2)
    return result


# ---------------------------------------------------------------------------
# Coin Flip (quick game)
# ---------------------------------------------------------------------------
@api.post("/games/coinflip")
async def coinflip(payload: CoinFlipInput, user: dict = Depends(require_user)):
    if payload.side not in ("heads", "tails"):
        raise HTTPException(status_code=400, detail="side must be heads or tails")
    if payload.bet < 10:
        raise HTTPException(status_code=400, detail="Minimum bet is 10 credits")
    if user.get("balance", 0) < payload.bet:
        raise HTTPException(status_code=400, detail="Insufficient credits")
    outcome = "heads" if secrets.randbelow(2) == 0 else "tails"
    win = payload.bet * 1.96 if outcome == payload.side else 0.0
    net = win - payload.bet
    updated = await adjust_balance(user["user_id"], delta_balance=net, wagered=payload.bet,
                                   won=win, biggest=win, played=1)
    await record_transaction(user["user_id"], "coinflip", net,
                             {"side": payload.side, "outcome": outcome, "bet": payload.bet, "win": win})
    return {"outcome": outcome, "win": round(win, 2), "net": round(net, 2),
            "balance": round(updated["balance"], 2)}


# ---------------------------------------------------------------------------
# Daily bonus
# ---------------------------------------------------------------------------
@api.get("/bonus/status")
async def bonus_status(user: dict = Depends(require_user)):
    last = user.get("last_bonus_claim")
    tier, _ = tier_for_wagered(user.get("total_wagered", 0.0))
    available = True
    seconds_left = 0
    if last:
        last_dt = datetime.fromisoformat(last) if isinstance(last, str) else last
        if last_dt.tzinfo is None:
            last_dt = last_dt.replace(tzinfo=timezone.utc)
        elapsed = datetime.now(timezone.utc) - last_dt
        cooldown = timedelta(hours=DAILY_BONUS_COOLDOWN_HOURS)
        if elapsed < cooldown:
            available = False
            seconds_left = int((cooldown - elapsed).total_seconds())
    return {"available": available, "seconds_left": seconds_left, "amount": tier["bonus"], "tier": tier["name"]}


@api.post("/bonus/claim")
async def bonus_claim(user: dict = Depends(require_user)):
    last = user.get("last_bonus_claim")
    if last:
        last_dt = datetime.fromisoformat(last) if isinstance(last, str) else last
        if last_dt.tzinfo is None:
            last_dt = last_dt.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) - last_dt < timedelta(hours=DAILY_BONUS_COOLDOWN_HOURS):
            raise HTTPException(status_code=400, detail="Daily bonus not ready yet")
    tier, _ = tier_for_wagered(user.get("total_wagered", 0.0))
    amount = float(tier["bonus"])
    await db.users.update_one({"user_id": user["user_id"]},
                              {"$inc": {"balance": amount},
                               "$set": {"last_bonus_claim": datetime.now(timezone.utc).isoformat()}})
    await record_transaction(user["user_id"], "daily_bonus", amount, {"tier": tier["name"]})
    updated = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"claimed": amount, "balance": round(updated["balance"], 2), "tier": tier["name"]}


# ---------------------------------------------------------------------------
# Wallet / history / leaderboard / vip
# ---------------------------------------------------------------------------
@api.get("/wallet/transactions")
async def transactions(user: dict = Depends(require_user)):
    txns = await db.transactions.find({"user_id": user["user_id"]}, {"_id": 0}) \
        .sort("created_at", -1).to_list(50)
    return txns


@api.get("/leaderboard")
async def leaderboard():
    top = await db.users.find({}, {"_id": 0, "name": 1, "total_won": 1, "biggest_win": 1,
                                    "total_wagered": 1, "user_id": 1}) \
        .sort("total_won", -1).to_list(20)
    result = []
    for i, u in enumerate(top):
        tier, _ = tier_for_wagered(u.get("total_wagered", 0.0))
        result.append({
            "rank": i + 1,
            "name": u.get("name", "Operative"),
            "total_won": round(u.get("total_won", 0.0), 2),
            "biggest_win": round(u.get("biggest_win", 0.0), 2),
            "vip_tier": tier["name"],
        })
    return result


@api.get("/vip/tiers")
async def vip_tiers():
    return VIP_TIERS


# ---------------------------------------------------------------------------
# Stripe deposit (buy credits)
# ---------------------------------------------------------------------------
@api.get("/payments/packages")
async def packages():
    return CREDIT_PACKAGES


def _ensure_price(pkg):
    """Idempotently ensure a Stripe product+price exists for a credit package."""
    existing = stripe.Price.list(lookup_keys=[pkg["lookup_key"]], active=True, limit=1).data
    if existing:
        return existing[0]
    product = None
    for p in stripe.Product.list(active=True, limit=100).auto_paging_iter():
        if p.get("metadata", {}).get("emergent_product_id") == pkg["id"]:
            product = p
            break
    if product is None:
        product = stripe.Product.create(
            name=f"{pkg['name']} - {pkg['credits']:,} Credits",
            tax_code="txcd_10000000",
            metadata={"managed_by": "emergent", "emergent_product_id": pkg["id"],
                      "credits": str(pkg["credits"] + pkg.get("bonus", 0))},
        )
    return stripe.Price.create(product=product.id, unit_amount=pkg["amount"], currency="usd",
                               lookup_key=pkg["lookup_key"], transfer_lookup_key=True)


@api.post("/payments/checkout")
async def checkout(payload: CheckoutInput, user: dict = Depends(require_user)):
    pkg = next((p for p in CREDIT_PACKAGES if p["lookup_key"] == payload.lookup_key), None)
    if not pkg:
        raise HTTPException(status_code=400, detail="Unknown package")
    try:
        price = _ensure_price(pkg)
        total_credits = pkg["credits"] + pkg.get("bonus", 0)
        kwargs = dict(
            line_items=[{"price": price.id, "quantity": 1}],
            mode="payment",
            success_url=f"{payload.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{payload.origin_url}/wallet",
            metadata={"user_id": user["user_id"], "lookup_key": pkg["lookup_key"], "credits": str(total_credits)},
        )
        try:
            session = stripe.checkout.Session.create(**kwargs, managed_payments={"enabled": True})
        except stripe.error.InvalidRequestError as e:
            msg = (getattr(e, "user_message", "") or "").lower()
            if "managed payments" in msg or "ineligible" in msg:
                session = stripe.checkout.Session.create(
                    **kwargs, automatic_tax={"enabled": True}, billing_address_collection="required")
            else:
                raise
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=500, detail="Payment provider error")

    await db.payment_transactions.insert_one({
        "session_id": session.id,
        "user_id": user["user_id"],
        "lookup_key": pkg["lookup_key"],
        "credits": total_credits,
        "amount": pkg["amount"],
        "currency": "usd",
        "status": "initiated",
        "payment_status": "pending",
        "credited": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"checkout_url": session.url, "session_id": session.id}


async def _credit_if_paid(record):
    if record.get("payment_status") == "paid" and not record.get("credited"):
        credits = float(record.get("credits", 0))
        await db.users.update_one({"user_id": record["user_id"]}, {"$inc": {"balance": credits}})
        await db.payment_transactions.update_one({"session_id": record["session_id"]},
                                                 {"$set": {"credited": True}})
        await record_transaction(record["user_id"], "deposit", credits,
                                 {"amount_usd": record["amount"] / 100.0, "package": record["lookup_key"]})


@api.get("/payments/status/{session_id}")
async def payment_status(session_id: str):
    record = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if record.get("payment_status") != "paid":
        try:
            s = stripe.checkout.Session.retrieve(session_id)
            if s.payment_status == "paid" or s.status == "complete":
                await db.payment_transactions.update_one(
                    {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                    {"$set": {"status": "completed", "payment_status": "paid",
                              "updated_at": datetime.now(timezone.utc).isoformat()}})
                record = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        except stripe.error.StripeError:
            pass
    await _credit_if_paid(record)
    return {"session_id": record["session_id"], "status": record["status"],
            "payment_status": record["payment_status"], "credits": record.get("credits", 0)}


@api.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid signature")
    obj, t = event["data"]["object"], event["type"]
    if t == "checkout.session.completed":
        await db.payment_transactions.update_one(
            {"session_id": obj["id"], "payment_status": {"$ne": "paid"}},
            {"$set": {"status": "completed", "payment_status": obj.get("payment_status", "paid"),
                      "updated_at": datetime.now(timezone.utc).isoformat()}})
        record = await db.payment_transactions.find_one({"session_id": obj["id"]}, {"_id": 0})
        if record:
            await _credit_if_paid(record)
    return {"status": "ok"}


@api.get("/")
async def root():
    return {"message": "Wages of War Casino API", "status": "operational"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token")
    await db.payment_transactions.create_index("session_id")
    # seed admin
    admin_email = os.environ.get("ADMIN_EMAIL")
    admin_password = os.environ.get("ADMIN_PASSWORD")
    if admin_email and admin_password:
        existing = await db.users.find_one({"email": admin_email.lower()})
        if existing is None:
            await db.users.insert_one({
                "user_id": f"user_{uuid.uuid4().hex[:12]}",
                "email": admin_email.lower(),
                "name": "High Command",
                "password_hash": hash_password(admin_password),
                "role": "admin",
                "provider": "email",
                "balance": 1000000.0,
                "total_wagered": 0.0, "total_won": 0.0, "biggest_win": 0.0,
                "games_played": 0, "last_bonus_claim": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        elif not verify_password(admin_password, existing.get("password_hash", "")):
            await db.users.update_one({"email": admin_email.lower()},
                                      {"$set": {"password_hash": hash_password(admin_password)}})
    logger.info("Wages of War Casino API ready")


@app.on_event("shutdown")
async def shutdown():
    client.close()
