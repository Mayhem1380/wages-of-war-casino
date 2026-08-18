from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

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
import asyncio
import shutil

import stripe

from games import (
    SLOT_MACHINES,
    PUBLIC_SLOT_IDS,
    spin_slot,
    play_keno,
    KENO_PAYTABLE,
    PAYLINES,
    VIP_TIERS,
    tier_for_wagered,
    CREDIT_PACKAGES,
    FLAGSHIP_IDS,
    JACKPOT_LADDER,
    spin_flagship,
    play_holdwin,
)
import cashier

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY") or "sk_test_emergent"
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
STRIPE_WEBHOOK_SECRETS = [
    s.strip() for s in STRIPE_WEBHOOK_SECRET.split(",") if s.strip()
]
TAX_MODE = "full"  # US + digital credits -> Stripe managed payments

STARTING_BALANCE = 10000.0
DAILY_BONUS_COOLDOWN_HOURS = 24
CASHBACK_COOLDOWN_HOURS = 168  # weekly

app = FastAPI(title="Wages of War Casino API")
api = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
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
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=604800,
        path="/",
    )


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
        "real_balance_cents": int(u.get("real_balance_cents", 0)),
        "real_balance_usd": round(int(u.get("real_balance_cents", 0)) / 100.0, 2),
        "kyc_status": u.get("kyc_status", "not_started"),
        "kyc_approved": bool(u.get("kyc_approved", False)),
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


async def require_admin(request: Request) -> dict:
    u = await require_user(request)
    if u.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return u


async def adjust_balance(
    user_id: str,
    delta_balance: float,
    wagered: float = 0.0,
    won: float = 0.0,
    biggest: float = None,
    played: int = 0,
):
    update = {
        "$inc": {
            "balance": delta_balance,
            "total_wagered": wagered,
            "total_won": won,
            "games_played": played,
        }
    }
    if biggest is not None:
        update["$max"] = {"biggest_win": biggest}
    await db.users.update_one({"user_id": user_id}, update)
    return await db.users.find_one({"user_id": user_id}, {"_id": 0})


async def record_transaction(
    user_id: str, ttype: str, amount: float, meta: dict = None
):
    await db.transactions.insert_one(
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": ttype,
            "amount": round(amount, 2),
            "meta": meta or {},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )


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
    net_loss = (user.get("total_wagered", 0.0) - snap_w) - (
        user.get("total_won", 0.0) - snap_won
    )
    amount = round(max(0.0, net_loss) * pct / 100.0, 2)
    return pct, amount, seconds_left, tier["name"]


async def grant_cashback(user: dict):
    """Grant weekly cashback if cooldown elapsed and there is a positive amount.
    The window stays open until an actual (>0) payout is made, then a 7-day cooldown begins.
    """
    pct, amount, seconds_left, tier_name = _cashback_preview(user)
    if pct <= 0 or seconds_left > 0 or amount <= 0:
        return None
    now_iso = datetime.now(timezone.utc).isoformat()
    upd = {
        "last_cashback_at": now_iso,
        "cashback_wagered_snapshot": user.get("total_wagered", 0.0),
        "cashback_won_snapshot": user.get("total_won", 0.0),
    }
    await db.users.update_one(
        {"user_id": user["user_id"]}, {"$set": upd, "$inc": {"balance": amount}}
    )
    await record_transaction(
        user["user_id"], "cashback", amount, {"tier": tier_name, "percent": pct}
    )
    return amount


# ---------------------------------------------------------------------------
# Support (simple automated help bot)
# ---------------------------------------------------------------------------


class SupportMessage(BaseModel):
    message: str


@api.post("/support/message")
async def support_message(payload: SupportMessage, user: dict = Depends(resolve_user)):
    text = payload.message.strip()
    row = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"] if user else "anonymous",
        "message": text,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.support_messages.insert_one(row)

    # Very small rule-based bot replies (POC). Expand with external bot later.
    lower = text.lower()
    if "deposit" in lower or "cashier" in lower:
        reply = "To deposit, open Wallet → Cashier. We accept Card (Stripe) and Crypto. For help, tell me which you want."
    elif "withdraw" in lower or "payout" in lower:
        reply = "Withdrawals route via the approval vault. Check /profile or /wallet → Transactions for status."
    elif "kyc" in lower or "id" in lower or "verify" in lower:
        reply = "KYC required for withdrawals over threshold. Use the Verification page to upload documents."
    else:
        reply = "Hi — I'm the 24/7 assistant. Try 'deposit', 'withdraw', or 'verify'. For urgent support contact admin@wow.local"

    bot = {
        "id": str(uuid.uuid4()),
        "user_id": "system",
        "message": reply,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.support_messages.insert_one(bot)
    return {"reply": reply}


# ---------------------------------------------------------------------------
# KYC / Identity Verification via Stripe Identity (MGA compliance, 18+ gate)
# Real-money withdrawals are blocked until kyc_approved=True.
# ---------------------------------------------------------------------------


def _is_18_or_older(dob) -> bool:
    """dob is Stripe's {year, month, day} dict from verified_outputs."""
    if not dob:
        return False
    try:
        from datetime import date

        birth = date(int(dob["year"]), int(dob["month"]), int(dob["day"]))
        today = date.today()
        age = today.year - birth.year - (
            (today.month, today.day) < (birth.month, birth.day)
        )
        return age >= 18
    except (KeyError, TypeError, ValueError):
        return False


async def _sync_kyc_from_stripe(user_id: str, session_id: str) -> dict:
    """Retrieve a Stripe Identity VerificationSession and persist the outcome.
    Used both by the webhook and as a polling fallback from /kyc/status."""
    try:
        vs = stripe.identity.VerificationSession.retrieve(
            session_id, expand=["verified_outputs"]
        )
    except Exception as e:
        logger.warning("kyc retrieve failed: %s", e)
        return {}
    status = vs.get("status")  # requires_input | processing | verified | canceled
    update = {
        "kyc_stripe_status": status,
        "kyc_updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if status == "verified":
        vo = vs.get("verified_outputs") or {}
        age_ok = _is_18_or_older(vo.get("dob"))
        update["kyc_approved"] = age_ok
        update["kyc_status"] = "approved" if age_ok else "age_failed"
        update["kyc_error"] = None if age_ok else "must_be_18_or_older"
    elif status == "processing":
        update["kyc_approved"] = False
        update["kyc_status"] = "processing"
    elif status == "requires_input":
        le = vs.get("last_error") or {}
        update["kyc_approved"] = False
        update["kyc_status"] = "requires_input"
        update["kyc_error"] = le.get("code") if le else None
    else:
        update["kyc_approved"] = False
        update["kyc_status"] = status or "not_started"
    await db.users.update_one({"user_id": user_id}, {"$set": update})
    return update


class KycSessionInput(BaseModel):
    origin_url: Optional[str] = None


@api.post("/kyc/session")
async def kyc_session(payload: KycSessionInput, user: dict = Depends(require_user)):
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if fresh.get("kyc_approved"):
        return {"already_approved": True}
    origin = (payload.origin_url or FRONTEND_URL).rstrip("/")
    kwargs = {
        "type": "document",
        "options": {"document": {"require_matching_selfie": True}},
        "metadata": {"user_id": user["user_id"]},
        "return_url": f"{origin}/cashier?kyc=complete",
    }
    if user.get("email"):
        kwargs["provided_details"] = {"email": user["email"]}
    try:
        session = stripe.identity.VerificationSession.create(**kwargs)
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=502, detail=f"Stripe Identity error: {e}")
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {
                "kyc_session_id": session.id,
                "kyc_status": "requires_input",
                "kyc_approved": False,
                "kyc_updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )
    return {"url": session.url, "session_id": session.id}


@api.get("/kyc/status")
async def kyc_status(user: dict = Depends(require_user)):
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not fresh.get("kyc_approved") and fresh.get("kyc_session_id"):
        await _sync_kyc_from_stripe(user["user_id"], fresh["kyc_session_id"])
        fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {
        "kyc_approved": bool(fresh.get("kyc_approved")),
        "status": fresh.get("kyc_status", "not_started"),
        "error": fresh.get("kyc_error"),
    }


# ---------------------------------------------------------------------------
# Gamble / buy-feature endpoints (POC)
# ---------------------------------------------------------------------------


class GambleInput(BaseModel):
    amount: float
    mode: str  # "color" or "suit"
    choice: str  # "red" or "black" or one of suits


@api.post("/games/gamble")
async def games_gamble(payload: GambleInput, user: dict = Depends(require_user)):
    amt = round(payload.amount, 2)
    if amt <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")
    u = await db.users.find_one({"user_id": user["user_id"]})
    if not u or u.get("balance", 0) < amt:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    # consume the win stake
    await adjust_balance(user["user_id"], -amt)

    import random

    outcome = None
    payout = 0.0
    if payload.mode == "color":
        # 50/50 chance
        pick = random.choice(["red", "black"])
        if pick == payload.choice:
            payout = round(amt * 2.0, 2)
            outcome = "win"
        else:
            outcome = "lose"
    else:
        # suit: 1/4 chance -> 4x payout
        pick = random.choice(["hearts", "diamonds", "clubs", "spades"])
        if pick == payload.choice:
            payout = round(amt * 4.0, 2)
            outcome = "win"
        else:
            outcome = "lose"

    if payout > 0:
        await adjust_balance(user["user_id"], payout)
        await record_transaction(
            user["user_id"],
            "gamble_win",
            payout,
            {"mode": payload.mode, "choice": payload.choice},
        )
    else:
        await record_transaction(
            user["user_id"],
            "gamble_loss",
            amt,
            {"mode": payload.mode, "choice": payload.choice},
        )

    return {"outcome": outcome, "payout": payout}


# ---------------------------------------------------------------------------
# Background worker: process pending withdrawals against the approval vault
# ---------------------------------------------------------------------------


async def _process_withdrawals_loop():
    while True:
        try:
            pending = await db.cashier_transactions.find(
                {"direction": "withdrawal", "status": "pending"}
            ).to_list(50)
            for t in pending:
                # attempt submit to vault
                try:
                    res = await cashier.vault_submit_withdrawal(
                        t.get("currency", "USD"),
                        t.get("amount_usd", 0),
                        t.get("destination", ""),
                        t.get("id"),
                    )
                    now_iso = datetime.now(timezone.utc).isoformat()
                    if res.get("ok"):
                        await db.cashier_transactions.update_one(
                            {"id": t["id"]},
                            {
                                "$set": {
                                    "status": "processing",
                                    "vault_id": res.get("vault_id"),
                                    "updated_at": now_iso,
                                }
                            },
                        )
                    else:
                        # keep pending; vault may be temporarily unavailable
                        await db.cashier_transactions.update_one(
                            {"id": t["id"]},
                            {"$set": {"status": "pending", "updated_at": now_iso}},
                        )
                except Exception:
                    pass
        except Exception:
            pass
        await asyncio.sleep(30)


@app.on_event("startup")
async def start_background_workers():
    asyncio.create_task(_process_withdrawals_loop())


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


class FleetEnquiryInput(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    company: Optional[str] = ""
    country: Optional[str] = ""
    message: str = Field(min_length=1)


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@api.post("/auth/register")
async def register(payload: RegisterInput, response: Response):
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(
            status_code=400, detail="An account with this email already exists"
        )
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
    await record_transaction(
        user_id,
        "signup_bonus",
        STARTING_BALANCE,
        {"note": "Welcome deployment credits"},
    )
    token = create_access_token(user_id, email)
    set_auth_cookie(response, token)
    return {"user": public_user(doc), "token": token}


@api.post("/auth/login")
async def login(payload: LoginInput, response: Response):
    email = payload.email.lower().strip()
    u = await db.users.find_one({"email": email})
    if (
        not u
        or not u.get("password_hash")
        or not verify_password(payload.password, u["password_hash"])
    ):
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
    return {
        "available": pct > 0 and seconds_left == 0 and amount > 0,
        "amount": amount,
        "percent": pct,
        "seconds_left": seconds_left,
        "tier": tier_name,
    }


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
        await db.users.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "picture": data.get("picture"),
                    "name": data.get("name") or existing.get("name"),
                }
            },
        )
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
        await record_transaction(
            user_id,
            "signup_bonus",
            STARTING_BALANCE,
            {"note": "Welcome deployment credits"},
        )

    session_token = data.get("session_token") or secrets.token_urlsafe(32)
    await db.user_sessions.insert_one(
        {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=604800,
        path="/",
    )
    return {"user": public_user(user_doc)}


# ---------------------------------------------------------------------------
# Game metadata
# ---------------------------------------------------------------------------
@api.get("/games/slots")
async def list_slots():
    machines = [SLOT_MACHINES[mid] for mid in PUBLIC_SLOT_IDS if mid in SLOT_MACHINES]
    machines = sorted(machines, key=lambda m: -m["popularity"])
    return [
        {
            "id": m["id"],
            "name": m["name"],
            "tagline": m["tagline"],
            "theme": m["theme"],
            "volatility": m["volatility"],
            "paylines": m["paylines"],
            "popularity": m["popularity"],
            "is_flagship": m["id"] in FLAGSHIP_IDS,
        }
        for m in machines
    ]


@api.get("/games/slots/{machine_id}")
async def slot_detail(machine_id: str):
    if machine_id not in PUBLIC_SLOT_IDS:
        raise HTTPException(status_code=404, detail="Machine not found")
    m = SLOT_MACHINES.get(machine_id)
    if not m:
        raise HTTPException(status_code=404, detail="Machine not found")
    return {
        "id": m["id"],
        "name": m["name"],
        "tagline": m["tagline"],
        "theme": m["theme"],
        "volatility": m["volatility"],
        "paylines": m["paylines"],
        "reels": m["reels"],
        "rows": m["rows"],
        "symbols": list(m["symbols"].keys()),
        "wild": m["wild"],
        "scatter": m["scatter"],
        "paytable": m["paytable"],
        "scatter_pay": m["scatter_pay"],
        "free_spins": m["free_spins"],
        "is_flagship": m["id"] in FLAGSHIP_IDS,
        "jackpots": JACKPOT_LADDER if m["id"] in FLAGSHIP_IDS else None,
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

    result = (
        spin_flagship(payload.machine_id, payload.bet)
        if payload.machine_id in FLAGSHIP_IDS
        else spin_slot(payload.machine_id, payload.bet)
    )
    net = result["total_win"] - payload.bet
    updated = await adjust_balance(
        user["user_id"],
        delta_balance=net,
        wagered=payload.bet,
        won=result["total_win"],
        biggest=result["total_win"],
        played=1,
    )
    await record_transaction(
        user["user_id"],
        "slots",
        net,
        {"machine": payload.machine_id, "bet": payload.bet, "win": result["total_win"]},
    )

    # Hold & Win trigger (flagship machines) -> open a bonus session
    holdwin_session = None
    if result.get("holdwin_triggered"):
        hw_id = str(uuid.uuid4())
        await db.holdwin.insert_one(
            {
                "session_id": hw_id,
                "user_id": user["user_id"],
                "machine_id": payload.machine_id,
                "bet": payload.bet,
                "initial_coins": result["firecoins"],
                "resolved": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        holdwin_session = {"session_id": hw_id, "coins": result["firecoins"]}
    result["holdwin_session"] = holdwin_session

    # Free-spins trigger -> open an interactive session (winnings only, rising multiplier)
    free_session = None
    if not result.get("holdwin_triggered") and result["free_spins_awarded"] > 0:
        session_id = str(uuid.uuid4())
        await db.free_spins.insert_one(
            {
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
            }
        )
        free_session = {
            "session_id": session_id,
            "spins_left": result["free_spins_awarded"],
            "multiplier": 1,
        }

    result["free_session"] = free_session
    result["balance"] = round(updated["balance"], 2)
    result["net"] = round(net, 2)
    return result


@api.post("/games/slots/freespin")
async def slots_freespin(payload: FreeSpinInput, user: dict = Depends(require_user)):
    sess = await db.free_spins.find_one({"session_id": payload.session_id})
    if (
        not sess
        or sess["user_id"] != user["user_id"]
        or not sess.get("active")
        or sess["spins_left"] <= 0
    ):
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

    await db.free_spins.update_one(
        {"session_id": payload.session_id},
        {
            "$set": {
                "spins_left": spins_left,
                "multiplier": next_multiplier,
                "total_win": total_session_win,
                "active": active,
            }
        },
    )

    updated = await adjust_balance(
        user["user_id"], delta_balance=win, won=win, biggest=win, played=1
    )
    if win > 0:
        await record_transaction(
            user["user_id"],
            "free_spin",
            win,
            {"machine": sess["machine_id"], "multiplier": multiplier},
        )

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


class HoldWinInput(BaseModel):
    session_id: str


@api.post("/games/slots/holdwin")
async def slots_holdwin(payload: HoldWinInput, user: dict = Depends(require_user)):
    sess = await db.holdwin.find_one({"session_id": payload.session_id})
    if not sess or sess["user_id"] != user["user_id"] or sess.get("resolved"):
        raise HTTPException(status_code=400, detail="No active Hold & Win session")

    result = play_holdwin(sess["bet"], sess["initial_coins"])
    await db.holdwin.update_one(
        {"session_id": payload.session_id}, {"$set": {"resolved": True}}
    )

    updated = await adjust_balance(
        user["user_id"],
        delta_balance=result["total_win"],
        won=result["total_win"],
        biggest=result["total_win"],
    )
    await record_transaction(
        user["user_id"],
        "hold_and_win",
        result["total_win"],
        {
            "machine": sess["machine_id"],
            "bet": sess["bet"],
            "jackpots": result["jackpots_won"],
            "full_grid": result["full_grid"],
        },
    )

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
        user["user_id"],
        delta_balance=net,
        wagered=payload.stake,
        won=result["win"],
        biggest=result["win"],
        played=1,
    )
    await record_transaction(
        user["user_id"],
        "keno",
        net,
        {"picks": result["picks"], "stake": payload.stake, "win": result["win"]},
    )
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
    updated = await adjust_balance(
        user["user_id"],
        delta_balance=net,
        wagered=payload.bet,
        won=win,
        biggest=win,
        played=1,
    )
    await record_transaction(
        user["user_id"],
        "coinflip",
        net,
        {"side": payload.side, "outcome": outcome, "bet": payload.bet, "win": win},
    )
    return {
        "outcome": outcome,
        "win": round(win, 2),
        "net": round(net, 2),
        "balance": round(updated["balance"], 2),
    }


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
    return {
        "available": available,
        "seconds_left": seconds_left,
        "amount": tier["bonus"],
        "tier": tier["name"],
    }


@api.post("/bonus/claim")
async def bonus_claim(user: dict = Depends(require_user)):
    last = user.get("last_bonus_claim")
    if last:
        last_dt = datetime.fromisoformat(last) if isinstance(last, str) else last
        if last_dt.tzinfo is None:
            last_dt = last_dt.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) - last_dt < timedelta(
            hours=DAILY_BONUS_COOLDOWN_HOURS
        ):
            raise HTTPException(status_code=400, detail="Daily bonus not ready yet")
    tier, _ = tier_for_wagered(user.get("total_wagered", 0.0))
    amount = float(tier["bonus"])
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$inc": {"balance": amount},
            "$set": {"last_bonus_claim": datetime.now(timezone.utc).isoformat()},
        },
    )
    await record_transaction(
        user["user_id"], "daily_bonus", amount, {"tier": tier["name"]}
    )
    updated = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {
        "claimed": amount,
        "balance": round(updated["balance"], 2),
        "tier": tier["name"],
    }


# ---------------------------------------------------------------------------
# Wallet / history / leaderboard / vip
# ---------------------------------------------------------------------------
@api.get("/wallet/transactions")
async def transactions(user: dict = Depends(require_user)):
    txns = (
        await db.transactions.find({"user_id": user["user_id"]}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(50)
    )
    return txns


@api.get("/leaderboard")
async def leaderboard():
    top = (
        await db.users.find(
            {},
            {
                "_id": 0,
                "name": 1,
                "total_won": 1,
                "biggest_win": 1,
                "total_wagered": 1,
                "user_id": 1,
            },
        )
        .sort("total_won", -1)
        .to_list(20)
    )
    result = []
    for i, u in enumerate(top):
        tier, _ = tier_for_wagered(u.get("total_wagered", 0.0))
        result.append(
            {
                "rank": i + 1,
                "name": u.get("name", "Operative"),
                "total_won": round(u.get("total_won", 0.0), 2),
                "biggest_win": round(u.get("biggest_win", 0.0), 2),
                "vip_tier": tier["name"],
            }
        )
    return result


@api.get("/vip/tiers")
async def vip_tiers():
    return VIP_TIERS


# ---------------------------------------------------------------------------
# Admin dashboard (role: admin)
# ---------------------------------------------------------------------------
class BalanceAdjustInput(BaseModel):
    amount: float
    mode: str = "delta"  # "delta" or "set"


@api.get("/admin/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    agg = await db.users.aggregate(
        [
            {
                "$group": {
                    "_id": None,
                    "players": {"$sum": 1},
                    "total_balance": {"$sum": "$balance"},
                    "total_wagered": {"$sum": "$total_wagered"},
                    "total_won": {"$sum": "$total_won"},
                    "games_played": {"$sum": "$games_played"},
                }
            }
        ]
    ).to_list(1)
    totals = agg[0] if agg else {}
    return {
        "players": totals.get("players", 0),
        "total_balance": round(totals.get("total_balance", 0.0) or 0.0, 2),
        "total_wagered": round(totals.get("total_wagered", 0.0) or 0.0, 2),
        "total_won": round(totals.get("total_won", 0.0) or 0.0, 2),
        "games_played": totals.get("games_played", 0) or 0,
        "enquiries": await db.fleet_enquiries.count_documents({}),
        "deposits": await db.payment_transactions.count_documents(
            {"payment_status": "paid"}
        ),
    }


@api.get("/admin/players")
async def admin_players(search: str = "", admin: dict = Depends(require_admin)):
    q = {}
    if search:
        q = {
            "$or": [
                {"email": {"$regex": search, "$options": "i"}},
                {"name": {"$regex": search, "$options": "i"}},
            ]
        }
    docs = await db.users.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [public_user(d) for d in docs]


@api.post("/admin/players/{user_id}/balance")
async def admin_adjust_balance(
    user_id: str, payload: BalanceAdjustInput, admin: dict = Depends(require_admin)
):
    target = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Player not found")
    if payload.mode == "set":
        new_balance = round(payload.amount, 2)
        await db.users.update_one(
            {"user_id": user_id}, {"$set": {"balance": new_balance}}
        )
        delta = new_balance - target.get("balance", 0.0)
    else:
        delta = round(payload.amount, 2)
        await db.users.update_one({"user_id": user_id}, {"$inc": {"balance": delta}})
    await record_transaction(
        user_id, "admin_adjust", delta, {"by": admin["email"], "mode": payload.mode}
    )
    fresh = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user_id": user_id, "balance": round(fresh["balance"], 2)}


@api.get("/admin/enquiries")
async def admin_enquiries(admin: dict = Depends(require_admin)):
    return (
        await db.fleet_enquiries.find({}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(200)
    )


@api.post("/fleet/enquiry")
async def fleet_enquiry(payload: FleetEnquiryInput):
    doc = {
        "id": str(uuid.uuid4()),
        "name": payload.name.strip(),
        "email": payload.email.lower().strip(),
        "company": (payload.company or "").strip(),
        "country": (payload.country or "").strip(),
        "message": payload.message.strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.fleet_enquiries.insert_one(doc)
    return {"ok": True, "id": doc["id"]}


@api.get("/cashback/history")
async def cashback_history(user: dict = Depends(require_user)):
    rows = (
        await db.transactions.find(
            {"user_id": user["user_id"], "type": "cashback"}, {"_id": 0}
        )
        .sort("created_at", -1)
        .to_list(50)
    )
    return rows


# ---------------------------------------------------------------------------
# Stripe deposit (buy credits)
# ---------------------------------------------------------------------------
@api.get("/payments/packages")
async def packages():
    return CREDIT_PACKAGES


def _ensure_price(pkg):
    """Idempotently ensure a Stripe product+price exists for a credit package."""
    existing = stripe.Price.list(
        lookup_keys=[pkg["lookup_key"]], active=True, limit=1
    ).data
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
            metadata={
                "managed_by": "emergent",
                "emergent_product_id": pkg["id"],
                "credits": str(pkg["credits"] + pkg.get("bonus", 0)),
            },
        )
    return stripe.Price.create(
        product=product.id,
        unit_amount=pkg["amount"],
        currency="usd",
        lookup_key=pkg["lookup_key"],
        transfer_lookup_key=True,
    )


@api.post("/payments/checkout")
async def checkout(payload: CheckoutInput, user: dict = Depends(require_user)):
    pkg = next(
        (p for p in CREDIT_PACKAGES if p["lookup_key"] == payload.lookup_key), None
    )
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
            metadata={
                "user_id": user["user_id"],
                "lookup_key": pkg["lookup_key"],
                "credits": str(total_credits),
            },
        )
        try:
            session = stripe.checkout.Session.create(
                **kwargs, managed_payments={"enabled": True}
            )
        except stripe.error.InvalidRequestError as e:
            msg = (getattr(e, "user_message", "") or "").lower()
            if "managed payments" in msg or "ineligible" in msg:
                session = stripe.checkout.Session.create(
                    **kwargs,
                    automatic_tax={"enabled": True},
                    billing_address_collection="required",
                )
            else:
                raise
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=500, detail="Payment provider error")

    await db.payment_transactions.insert_one(
        {
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
        }
    )
    return {"checkout_url": session.url, "session_id": session.id}


async def _credit_if_paid(record):
    if record.get("payment_status") == "paid" and not record.get("credited"):
        if record.get("kind") == "cashier_deposit":
            usd_cents = int(record.get("usd_cents", 0))
            await db.users.update_one(
                {"user_id": record["user_id"]},
                {"$inc": {"real_balance_cents": usd_cents}},
            )
            await db.payment_transactions.update_one(
                {"session_id": record["session_id"]}, {"$set": {"credited": True}}
            )
            await db.cashier_transactions.update_one(
                {"provider_ref": record["session_id"]},
                {
                    "$set": {
                        "status": "completed",
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                },
            )
            await record_transaction(
                record["user_id"],
                "deposit_fiat",
                usd_cents / 100.0,
                {
                    "method": "card",
                    "currency": record.get("currency"),
                    "session_id": record["session_id"],
                },
            )
        else:
            credits = float(record.get("credits", 0))
            await db.users.update_one(
                {"user_id": record["user_id"]}, {"$inc": {"balance": credits}}
            )
            await db.payment_transactions.update_one(
                {"session_id": record["session_id"]}, {"$set": {"credited": True}}
            )
            await record_transaction(
                record["user_id"],
                "deposit",
                credits,
                {
                    "amount_usd": record["amount"] / 100.0,
                    "package": record["lookup_key"],
                },
            )


@api.get("/payments/status/{session_id}")
async def payment_status(session_id: str):
    record = await db.payment_transactions.find_one(
        {"session_id": session_id}, {"_id": 0}
    )
    if not record:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if record.get("payment_status") != "paid":
        try:
            s = stripe.checkout.Session.retrieve(session_id)
            if s.payment_status == "paid" or s.status == "complete":
                await db.payment_transactions.update_one(
                    {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                    {
                        "$set": {
                            "status": "completed",
                            "payment_status": "paid",
                            "updated_at": datetime.now(timezone.utc).isoformat(),
                        }
                    },
                )
                record = await db.payment_transactions.find_one(
                    {"session_id": session_id}, {"_id": 0}
                )
        except stripe.error.StripeError:
            pass
    await _credit_if_paid(record)
    return {
        "session_id": record["session_id"],
        "status": record["status"],
        "payment_status": record["payment_status"],
        "credits": record.get("credits", 0),
    }


@api.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    event = None
    for secret in STRIPE_WEBHOOK_SECRETS:
        try:
            event = stripe.Webhook.construct_event(payload, sig, secret)
            break
        except Exception:
            continue
    if event is None:
        raise HTTPException(status_code=400, detail="Invalid signature")
    obj, t = event["data"]["object"], event["type"]
    if t == "checkout.session.completed":
        await db.payment_transactions.update_one(
            {"session_id": obj["id"], "payment_status": {"$ne": "paid"}},
            {
                "$set": {
                    "status": "completed",
                    "payment_status": obj.get("payment_status", "paid"),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
        record = await db.payment_transactions.find_one(
            {"session_id": obj["id"]}, {"_id": 0}
        )
        if record:
            await _credit_if_paid(record)
    elif t.startswith("identity.verification_session."):
        user_id = (obj.get("metadata") or {}).get("user_id")
        if user_id:
            await _sync_kyc_from_stripe(user_id, obj["id"])
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# REAL-MONEY CASHIER (Stripe fiat + NOWPayments crypto + approval vault)
# Sandbox / test-key framework. All balances held in USD cents.
# ---------------------------------------------------------------------------
class StripeCashierInput(BaseModel):
    currency: str
    amount: float = Field(gt=0)
    origin_url: str


class CryptoDepositInput(BaseModel):
    pay_currency: str
    amount_usd: float = Field(gt=0)


class WithdrawInput(BaseModel):
    currency: str
    amount: float = Field(gt=0)
    destination: str = Field(min_length=4)


def _pub_cashier(t: dict) -> dict:
    return {
        "id": t["id"],
        "direction": t["direction"],
        "method": t["method"],
        "currency": t["currency"],
        "amount": t["amount"],
        "amount_usd": round(t.get("amount_usd_cents", 0) / 100.0, 2),
        "status": t["status"],
        "provider": t.get("provider"),
        "destination": t.get("destination"),
        "pay_address": t.get("pay_address"),
        "pay_amount": t.get("pay_amount"),
        "sandbox": t.get("sandbox", False),
        "created_at": t["created_at"],
        "updated_at": t.get("updated_at"),
    }


@api.get("/cashier/currencies")
async def cashier_currencies():
    return {
        "currencies": cashier.currency_list(),
        "min_deposit_aud": cashier.MIN_DEPOSIT_AUD,
        "min_withdraw_aud": cashier.MIN_WITHDRAW_AUD,
        "min_deposit_usd": round(cashier.MIN_DEPOSIT_USD_CENTS / 100.0, 2),
        "min_withdraw_usd": round(cashier.MIN_WITHDRAW_USD_CENTS / 100.0, 2),
    }


@api.get("/cashier/summary")
async def cashier_summary(user: dict = Depends(require_user)):
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    cents = int(fresh.get("real_balance_cents", 0))
    return {
        "real_balance_cents": cents,
        "real_balance_usd": round(cents / 100.0, 2),
        "min_deposit_usd": round(cashier.MIN_DEPOSIT_USD_CENTS / 100.0, 2),
        "min_withdraw_usd": round(cashier.MIN_WITHDRAW_USD_CENTS / 100.0, 2),
        "crypto_live": not cashier._is_placeholder_np(),
        "vault_live": not cashier.is_placeholder_vault(),
        "sandbox": cashier._is_placeholder_np() or cashier.is_placeholder_vault(),
    }


@api.post("/cashier/deposit/stripe")
async def cashier_deposit_stripe(
    payload: StripeCashierInput, user: dict = Depends(require_user)
):
    code = payload.currency.upper()
    if code not in cashier.FIAT_CODES:
        raise HTTPException(status_code=400, detail="Unsupported fiat currency")
    usd_cents = cashier.to_usd_cents(payload.amount, code)
    if usd_cents < cashier.MIN_DEPOSIT_USD_CENTS:
        raise HTTPException(
            status_code=400, detail=f"Minimum deposit is {cashier.MIN_DEPOSIT_AUD} AUD"
        )
    minor = cashier.to_minor_unit(payload.amount, code)
    try:
        session = stripe.checkout.Session.create(
            line_items=[
                {
                    "price_data": {
                        "currency": code.lower(),
                        "product_data": {"name": "Wages of War Casino — Cash Deposit"},
                        "unit_amount": minor,
                    },
                    "quantity": 1,
                }
            ],
            mode="payment",
            success_url=f"{payload.origin_url}/cashier?deposit=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{payload.origin_url}/cashier?deposit=cancel",
            metadata={
                "kind": "cashier_deposit",
                "user_id": user["user_id"],
                "usd_cents": str(usd_cents),
                "currency": code,
            },
        )
    except stripe.error.StripeError as e:
        logger.error(f"Stripe cashier error: {e}")
        raise HTTPException(status_code=500, detail="Payment provider error")

    now_iso = datetime.now(timezone.utc).isoformat()
    await db.payment_transactions.insert_one(
        {
            "session_id": session.id,
            "user_id": user["user_id"],
            "kind": "cashier_deposit",
            "usd_cents": usd_cents,
            "amount": minor,
            "currency": code,
            "status": "initiated",
            "payment_status": "pending",
            "credited": False,
            "created_at": now_iso,
            "updated_at": now_iso,
        }
    )
    await db.cashier_transactions.insert_one(
        {
            "id": str(uuid.uuid4()),
            "user_id": user["user_id"],
            "user_email": user.get("email"),
            "user_name": user.get("name"),
            "direction": "deposit",
            "method": "card",
            "currency": code,
            "amount": payload.amount,
            "amount_usd_cents": usd_cents,
            "status": "pending",
            "provider": "stripe",
            "provider_ref": session.id,
            "sandbox": False,
            "created_at": now_iso,
            "updated_at": now_iso,
        }
    )
    return {"checkout_url": session.url, "session_id": session.id}


@api.post("/cashier/deposit/crypto")
async def cashier_deposit_crypto(
    payload: CryptoDepositInput, user: dict = Depends(require_user)
):
    code = payload.pay_currency.upper()
    if code not in cashier.CRYPTO_CODES:
        raise HTTPException(status_code=400, detail="Unsupported crypto currency")
    usd_cents = round(payload.amount_usd * 100)
    if usd_cents < cashier.MIN_DEPOSIT_USD_CENTS:
        raise HTTPException(
            status_code=400, detail=f"Minimum deposit is {cashier.MIN_DEPOSIT_AUD} AUD"
        )
    order_id = f"wow:{user['user_id']}:{uuid.uuid4().hex[:10]}"
    ipn_url = f"{os.environ.get('FRONTEND_URL','').replace('http://','https://')}/api/webhooks/nowpayments"
    try:
        pay = await cashier.np_create_payment(
            payload.amount_usd, code, order_id, ipn_url
        )
    except cashier.CryptoProviderError as e:
        raise HTTPException(status_code=502, detail=str(e))
    now_iso = datetime.now(timezone.utc).isoformat()
    txn = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "user_email": user.get("email"),
        "user_name": user.get("name"),
        "direction": "deposit",
        "method": "crypto",
        "currency": code,
        "amount": pay["pay_amount"],
        "amount_usd_cents": usd_cents,
        "status": "pending",
        "provider": "nowpayments",
        "provider_ref": pay["payment_id"],
        "pay_address": pay["pay_address"],
        "pay_amount": pay["pay_amount"],
        "sandbox": pay["sandbox"],
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    await db.cashier_transactions.insert_one(dict(txn))
    return {
        "payment_id": pay["payment_id"],
        "pay_address": pay["pay_address"],
        "pay_amount": pay["pay_amount"],
        "pay_currency": code,
        "amount_usd": payload.amount_usd,
        "status": pay["status"],
        "sandbox": pay["sandbox"],
    }


@api.get("/cashier/deposit/crypto/status/{payment_id}")
async def cashier_crypto_status(payment_id: str, user: dict = Depends(require_user)):
    t = await db.cashier_transactions.find_one(
        {"provider_ref": payment_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not t:
        raise HTTPException(status_code=404, detail="Deposit not found")
    return {
        "payment_id": payment_id,
        "status": t["status"],
        "sandbox": t.get("sandbox", False),
    }


async def _credit_crypto_deposit(payment_id: str):
    t = await db.cashier_transactions.find_one_and_update(
        {"provider_ref": payment_id, "status": "pending", "direction": "deposit"},
        {
            "$set": {
                "status": "completed",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )
    if t:
        await db.users.update_one(
            {"user_id": t["user_id"]},
            {"$inc": {"real_balance_cents": int(t["amount_usd_cents"])}},
        )
        await record_transaction(
            t["user_id"],
            "deposit_crypto",
            t["amount_usd_cents"] / 100.0,
            {"method": "crypto", "currency": t["currency"], "payment_id": payment_id},
        )


@api.post("/webhooks/nowpayments")
async def nowpayments_ipn(request: Request):
    payload = await request.json()
    if not cashier.np_verify_ipn(payload, request.headers.get("x-nowpayments-sig")):
        raise HTTPException(status_code=401, detail="Invalid IPN signature")
    payment_id = str(payload.get("payment_id", ""))
    if payment_id and payload.get("payment_status") == "finished":
        await _credit_crypto_deposit(payment_id)
    return {"received": True}


@api.post("/cashier/withdraw")
async def cashier_withdraw(payload: WithdrawInput, user: dict = Depends(require_user)):
    code = payload.currency.upper()
    if code not in cashier.CURRENCIES:
        raise HTTPException(status_code=400, detail="Unsupported currency")
    usd_cents = cashier.to_usd_cents(payload.amount, code)
    if usd_cents < cashier.MIN_WITHDRAW_USD_CENTS:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum withdrawal is {cashier.MIN_WITHDRAW_AUD} AUD",
        )
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not fresh.get("kyc_approved"):
        raise HTTPException(
            status_code=403,
            detail="Identity verification required before withdrawing. Please complete KYC in the Cashier.",
        )
    if int(fresh.get("real_balance_cents", 0)) < usd_cents:
        raise HTTPException(status_code=400, detail="Insufficient cash balance")
    # hold funds immediately
    await db.users.update_one(
        {"user_id": user["user_id"]}, {"$inc": {"real_balance_cents": -usd_cents}}
    )
    ref = str(uuid.uuid4())
    vault = await cashier.vault_submit_withdrawal(
        code, payload.amount, payload.destination, ref
    )
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.cashier_transactions.insert_one(
        {
            "id": ref,
            "user_id": user["user_id"],
            "user_email": user.get("email"),
            "user_name": user.get("name"),
            "direction": "withdrawal",
            "method": "crypto" if code in cashier.CRYPTO_CODES else "card",
            "currency": code,
            "amount": payload.amount,
            "amount_usd_cents": usd_cents,
            "status": "pending",
            "provider": "vault",
            "provider_ref": vault.get("vault_id") or ref,
            "destination": payload.destination,
            "vault_ok": vault["ok"],
            "vault_detail": vault["detail"],
            "sandbox": cashier.is_placeholder_vault(),
            "created_at": now_iso,
            "updated_at": now_iso,
        }
    )
    await record_transaction(
        user["user_id"],
        "withdrawal_request",
        -usd_cents / 100.0,
        {"currency": code, "destination": payload.destination, "status": "pending"},
    )
    return {
        "id": ref,
        "status": "pending",
        "vault_connected": vault["ok"],
        "balance_usd": round(
            (int(fresh.get("real_balance_cents", 0)) - usd_cents) / 100.0, 2
        ),
    }


@api.get("/cashier/transactions")
async def cashier_transactions(user: dict = Depends(require_user)):
    rows = (
        await db.cashier_transactions.find({"user_id": user["user_id"]}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(100)
    )
    return [_pub_cashier(t) for t in rows]


# ---- Admin cashier controls ----
@api.get("/admin/cashier/summary")
async def admin_cashier_summary(admin: dict = Depends(require_admin)):
    agg = await db.cashier_transactions.aggregate(
        [
            {
                "$group": {
                    "_id": {"direction": "$direction", "status": "$status"},
                    "usd": {"$sum": "$amount_usd_cents"},
                    "n": {"$sum": 1},
                }
            }
        ]
    ).to_list(100)
    deposits = sum(
        g["usd"]
        for g in agg
        if g["_id"]["direction"] == "deposit" and g["_id"]["status"] == "completed"
    )
    withdrawals = sum(
        g["usd"]
        for g in agg
        if g["_id"]["direction"] == "withdrawal" and g["_id"]["status"] == "completed"
    )
    pending_wd = sum(
        g["n"]
        for g in agg
        if g["_id"]["direction"] == "withdrawal" and g["_id"]["status"] == "pending"
    )
    bal = await db.users.aggregate(
        [{"$group": {"_id": None, "t": {"$sum": "$real_balance_cents"}}}]
    ).to_list(1)
    return {
        "total_deposits_usd": round(deposits / 100.0, 2),
        "total_withdrawals_usd": round(withdrawals / 100.0, 2),
        "total_player_balances_usd": round((bal[0]["t"] if bal else 0) / 100.0, 2),
        "pending_withdrawals": pending_wd,
    }


@api.get("/admin/cashier/transactions")
async def admin_cashier_transactions(
    search: str = "",
    method: str = "",
    status: str = "",
    direction: str = "",
    admin: dict = Depends(require_admin),
):
    q = {}
    if search:
        q["$or"] = [
            {"user_email": {"$regex": search, "$options": "i"}},
            {"user_name": {"$regex": search, "$options": "i"}},
        ]
    if method:
        q["method"] = method
    if status:
        q["status"] = status
    if direction:
        q["direction"] = direction
    rows = (
        await db.cashier_transactions.find(q, {"_id": 0})
        .sort("created_at", -1)
        .to_list(300)
    )
    return [
        {
            **_pub_cashier(t),
            "user_email": t.get("user_email"),
            "user_name": t.get("user_name"),
            "vault_ok": t.get("vault_ok"),
            "vault_detail": t.get("vault_detail"),
        }
        for t in rows
    ]


@api.post("/admin/cashier/withdrawals/{txn_id}/{action}")
async def admin_cashier_withdrawal_action(
    txn_id: str, action: str, admin: dict = Depends(require_admin)
):
    if action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="action must be approve or reject")
    t = await db.cashier_transactions.find_one(
        {"id": txn_id, "direction": "withdrawal"}
    )
    if not t or t["status"] != "pending":
        raise HTTPException(
            status_code=400, detail="No pending withdrawal with that id"
        )
    now_iso = datetime.now(timezone.utc).isoformat()
    if action == "approve":
        await db.cashier_transactions.update_one(
            {"id": txn_id}, {"$set": {"status": "completed", "updated_at": now_iso}}
        )
        await record_transaction(
            t["user_id"],
            "withdrawal_approved",
            -t["amount_usd_cents"] / 100.0,
            {"currency": t["currency"], "by": admin["email"]},
        )
        return {"id": txn_id, "status": "completed"}
    # reject -> refund held funds
    await db.users.update_one(
        {"user_id": t["user_id"]},
        {"$inc": {"real_balance_cents": int(t["amount_usd_cents"])}},
    )
    await db.cashier_transactions.update_one(
        {"id": txn_id}, {"$set": {"status": "rejected", "updated_at": now_iso}}
    )
    await record_transaction(
        t["user_id"],
        "withdrawal_rejected",
        t["amount_usd_cents"] / 100.0,
        {"currency": t["currency"], "by": admin["email"]},
    )
    return {"id": txn_id, "status": "rejected"}


@api.get("/")
async def root():
    return {"message": "Wages of War Casino API", "status": "operational"}


app.include_router(api)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


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
            await db.users.insert_one(
                {
                    "user_id": f"user_{uuid.uuid4().hex[:12]}",
                    "email": admin_email.lower(),
                    "name": "High Command",
                    "password_hash": hash_password(admin_password),
                    "role": "admin",
                    "provider": "email",
                    "balance": 1000000.0,
                    "total_wagered": 0.0,
                    "total_won": 0.0,
                    "biggest_win": 0.0,
                    "games_played": 0,
                    "last_bonus_claim": None,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            )
        elif not verify_password(admin_password, existing.get("password_hash", "")):
            await db.users.update_one(
                {"email": admin_email.lower()},
                {"$set": {"password_hash": hash_password(admin_password)}},
            )
    logger.info("Wages of War Casino API ready")


@app.on_event("shutdown")
async def shutdown():
    client.close()
