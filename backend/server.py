from dotenv import load_dotenv
from pathlib import Path
import os
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import OperationFailure
import logging
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
import uuid
import bcrypt
import jwt
import secrets
import urllib.request
import json
from datetime import datetime, timezone, timedelta
import asyncio
import shutil
import re
from urllib.parse import urlparse

import stripe

from games import (
    SLOT_MACHINES,
    PUBLIC_SLOT_IDS,
    spin_slot,
    play_keno,
    play_wow_keno,
    play_side_keno,
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

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("wagesofwar")

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
db_name = os.environ.get("DB_NAME", "test_database")
client = None
db = None


def _ensure_db():
    global client, db
    if client is None or db is None:
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
    return db


JWT_SECRET = os.environ.get("JWT_SECRET", "").strip()
JWT_ALGORITHM = "HS256"
FRONTEND_URL = os.environ.get("FRONTEND_URL", "").strip()

STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "").strip()
STRIPE_USE_MOCK = (
    not STRIPE_SECRET_KEY
    or "replace" in STRIPE_SECRET_KEY.lower()
    or "placeholder" in STRIPE_SECRET_KEY.lower()
    or STRIPE_SECRET_KEY.startswith("sk_test_")
    or STRIPE_SECRET_KEY.startswith("pk_test_")
)
if STRIPE_USE_MOCK:
    logger.warning(
        "STRIPE_SECRET_KEY is placeholder/test-only; using safe in-memory Stripe mock mode"
    )
else:
    stripe.api_key = STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
STRIPE_WEBHOOK_SECRETS = [
    s.strip() for s in STRIPE_WEBHOOK_SECRET.split(",") if s.strip()
]
TAX_MODE = "full"  # US + digital credits -> Stripe managed payments

if STRIPE_USE_MOCK:
    class _MockListResult(dict):
        def __init__(self, data=None):
            self.data = list(data or [])
            super().__init__(data=self.data)

        def auto_paging_iter(self):
            return iter(self.data)

    class _MockSession(dict):
        def __getattr__(self, name):
            return self.get(name)

    class _MockVerification(dict):
        def __getattr__(self, name):
            return self.get(name)

    class _MockStripeSession:
        @staticmethod
        def create(**kwargs):
            sid = "cs_" + uuid.uuid4().hex[:16]
            metadata = kwargs.get("metadata") or {}
            obj = _MockSession(
                id=sid,
                url=f"https://checkout.stripe.com/pay/{sid}",
                status="complete" if metadata.get("kind") == "cashier_deposit" else "open",
                payment_status="paid" if metadata.get("kind") == "cashier_deposit" else "unpaid",
            )
            obj.id = sid
            obj.url = f"https://checkout.stripe.com/pay/{sid}"
            obj.status = "complete" if metadata.get("kind") == "cashier_deposit" else "open"
            obj.payment_status = "paid" if metadata.get("kind") == "cashier_deposit" else "unpaid"
            return obj

        @staticmethod
        def retrieve(session_id):
            obj = _MockSession(id=session_id, status="complete", payment_status="paid")
            obj.id = session_id
            obj.status = "complete"
            obj.payment_status = "paid"
            return obj

    class _MockVerificationSession:
        @staticmethod
        def create(**kwargs):
            sid = "vs_" + uuid.uuid4().hex[:16]
            obj = _MockVerification(id=sid, url=f"https://verify.stripe.com/{sid}", status="requires_input")
            obj.id = sid
            obj.url = f"https://verify.stripe.com/{sid}"
            obj.status = "requires_input"
            return obj

        @staticmethod
        def retrieve(session_id, expand=None):
            obj = _MockVerification(
                id=session_id,
                status="requires_input",
                verified_outputs={},
                last_error=None,
            )
            obj.id = session_id
            obj.status = "requires_input"
            obj.verified_outputs = {}
            obj.last_error = None
            return obj

    class _MockProduct:
        @staticmethod
        def list(active=True, limit=100):
            return _MockListResult([])

        @staticmethod
        def create(**kwargs):
            obj = type("Product", (), {})()
            obj.id = "prod_mock_" + uuid.uuid4().hex[:12]
            obj.metadata = kwargs.get("metadata") or {}
            return obj

    class _MockPrice:
        @staticmethod
        def list(lookup_keys=None, active=True, limit=1):
            return _MockListResult([])

        @staticmethod
        def create(**kwargs):
            obj = type("Price", (), {})()
            obj.id = "price_mock_" + uuid.uuid4().hex[:12]
            return obj

    class _MockWebhook:
        @staticmethod
        def construct_event(payload, sig, secret):
            return {
                "type": "checkout.session.completed",
                "data": {"object": {"id": "cs_mock_placeholder", "payment_status": "paid"}},
            }

    stripe.checkout.Session = _MockStripeSession
    stripe.identity.VerificationSession = _MockVerificationSession
    stripe.Product = _MockProduct
    stripe.Price = _MockPrice
    stripe.Webhook = _MockWebhook

MAX_DEPOSIT_AUD = cashier.MAX_DEPOSIT_AUD
MAX_WITHDRAW_AUD = cashier.MAX_WITHDRAW_AUD

STARTING_BALANCE = 10000.0
DAILY_BONUS_COOLDOWN_HOURS = 24
CASHBACK_COOLDOWN_HOURS = 168  # weekly

REFERRAL_REWARD_CENTS = int(os.environ.get("REFERRAL_REWARD_CENTS", "500"))
# House protection: keep 30% of total deposits locked as a solvency reserve that
# can never be released via player withdrawals.
PROFIT_RESERVE_PCT = float(os.environ.get("PROFIT_RESERVE_PCT", "0.30"))

AUTH_FAILURE_WINDOW_SECONDS = 900
AUTH_FAILURE_LIMIT = 5
_AUTH_FAILURES = defaultdict(list)


def _resolved_cors_origins() -> List[str]:
    """Build an explicit allowlist for credentialed CORS requests.

    Browsers reject wildcard origins when credentials are enabled, so we always
    echo a concrete origin instead of returning '*'. If nothing is configured,
    we fall back to the usual local dev ports and require explicit env values for
    hosted deployments.
    """
    values: List[str] = []
    seen = set()

    for raw in [
        os.environ.get("CORS_ORIGINS", ""),
        os.environ.get("FRONTEND_URL", ""),
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]:
        for item in str(raw).split(","):
            origin = item.strip().rstrip("/")
            if not origin or origin == "*" or origin in seen:
                continue
            if not origin.startswith(("http://", "https://")):
                continue
            seen.add(origin)
            values.append(origin)

    if not values:
        values = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
        ]
    return values


CORS_ORIGINS = _resolved_cors_origins()
CORS_ALLOW_ORIGINS = CORS_ORIGINS
# Any subdomain of preview.emergentagent.com is a trusted first-party preview host.
CORS_ALLOW_ORIGIN_REGEX = r"^(https?://(localhost|127\.0\.0\.1)(:\d+)?|https://[a-zA-Z0-9-]+\.preview\.emergentagent\.com)$"


def _safe_frontend_origin(candidate: Optional[str]) -> str:
    """Accept only configured or first-party preview origins for redirects."""
    origin = (candidate or FRONTEND_URL).strip().rstrip("/")
    parsed = urlparse(origin)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return FRONTEND_URL.rstrip("/")
    if origin in CORS_ORIGINS or re.match(CORS_ALLOW_ORIGIN_REGEX, origin):
        return origin
    return FRONTEND_URL.rstrip("/")


def _mask_financial_value(value: Optional[str]) -> Optional[str]:
    cleaned = "".join(ch for ch in (value or "") if ch.isalnum())
    return f"••••{cleaned[-4:]}" if cleaned else None


app = FastAPI(title="Wages of War Casino API")
api = APIRouter(prefix="/api")


async def record_house_cashflow(
    amount_usd: float,
    kind: str,
    reason: str,
    metadata: Optional[dict] = None,
):
    """Track the house bankroll ledger for inflow/outflow events.

    Positive cashflow means money comes into the house. Negative cashflow means
    the house pays out or credits a player. This keeps the platform solvent and
    provides automatic payout coverage reporting.
    """
    amount = float(amount_usd or 0.0)
    signed_amount = abs(amount)
    cents = int(round(signed_amount * 100.0))
    inward_kinds = {"house_win", "player_loss", "deposit", "inflow"}
    delta_cents = cents if kind in inward_kinds else -cents
    now_iso = datetime.now(timezone.utc).isoformat()

    await db.house_ledger.insert_one(
        {
            "kind": kind,
            "reason": reason,
            "amount_usd": round(signed_amount, 2),
            "delta_cents": delta_cents,
            "metadata": metadata or {},
            "created_at": now_iso,
        }
    )

    await db.house_bankroll.update_one(
        {"_id": "house"},
        {
            "$setOnInsert": {
                "starting_bankroll_cents": 0,
                "pending_payout_cents": 0,
            },
            "$inc": {
                "bankroll_cents": delta_cents,
                "cash_in_cents": max(delta_cents, 0),
                "cash_out_cents": max(-delta_cents, 0),
            },
            "$set": {"updated_at": now_iso},
        },
        upsert=True,
    )
    return await get_house_bankroll_summary()


async def get_house_bankroll_summary():
    summary = await db.house_bankroll.find_one({"_id": "house"}, {"_id": 0})
    if not summary:
        summary = {
            "starting_bankroll_cents": 0,
            "bankroll_cents": 0,
            "cash_in_cents": 0,
            "cash_out_cents": 0,
            "pending_payout_cents": 0,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    cash_in = int(summary.get("cash_in_cents", 0))
    bankroll = int(summary.get("bankroll_cents", 0))
    # 30% profit reserve — lock a solvency buffer equal to 30% of total deposits.
    reserve_cents = int(round(max(cash_in, 0) * PROFIT_RESERVE_PCT))
    available = max(bankroll - reserve_cents, 0)
    coverage = 0.0
    if cash_in:
        coverage = round(available / max(cash_in, 1), 4)
    return {
        "starting_bankroll_cents": int(summary.get("starting_bankroll_cents", 0)),
        "bankroll_cents": int(summary.get("bankroll_cents", 0)),
        "bankroll_usd": round(int(summary.get("bankroll_cents", 0)) / 100.0, 2),
        "cash_in_cents": int(summary.get("cash_in_cents", 0)),
        "cash_out_cents": int(summary.get("cash_out_cents", 0)),
        "pending_payout_cents": int(summary.get("pending_payout_cents", 0)),
        "reserve_pct": PROFIT_RESERVE_PCT,
        "reserve_cents": reserve_cents,
        "reserve_usd": round(reserve_cents / 100.0, 2),
        "available_cents": available,
        "available_usd": round(available / 100.0, 2),
        "coverage_ratio": coverage,
        "updated_at": summary.get("updated_at"),
    }


def validate_runtime_config() -> None:
    """Log high-impact config issues so production misconfigurations are obvious."""
    global JWT_SECRET, FRONTEND_URL

    env_name = os.environ.get("ENVIRONMENT", os.environ.get("APP_ENV", "")).lower()
    is_prod = env_name in {"prod", "production", "live"}

    FRONTEND_URL = os.environ.get("FRONTEND_URL", FRONTEND_URL).strip()
    JWT_SECRET = os.environ.get("JWT_SECRET", JWT_SECRET).strip()

    issues = []
    warnings = []

    if STRIPE_SECRET_KEY.startswith("sk_test_"):
        warnings.append("STRIPE_SECRET_KEY is a test key (sk_test_*)")

    if not STRIPE_WEBHOOK_SECRETS:
        issues.append("STRIPE_WEBHOOK_SECRET is missing")

    if not FRONTEND_URL:
        issues.append("FRONTEND_URL is missing")

    if not JWT_SECRET or "change-me" in JWT_SECRET.lower() or "replace" in JWT_SECRET.lower():
        issues.append("JWT_SECRET is missing or placeholder")

    if cashier._is_placeholder_np():
        warnings.append("NOWPAYMENTS_API_KEY is placeholder/missing; crypto deposits run in sandbox")

    if "sandbox" in cashier.NOWPAYMENTS_BASE_URL.lower():
        warnings.append("NOWPAYMENTS_BASE_URL points to sandbox")

    if cashier.is_placeholder_vault():
        warnings.append("VAULT_API_KEY is placeholder/test; withdrawals stay in local pending flow")

    for msg in warnings:
        logger.warning("CONFIG WARNING: %s", msg)

    if issues:
        for msg in issues:
            logger.error("CONFIG ERROR: %s", msg)
        if is_prod:
            raise RuntimeError(
                "Invalid production configuration. Resolve CONFIG ERROR entries and redeploy."
            )


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
        "signup_verification_bonus_claimed": bool(
            u.get("signup_verification_bonus_claimed", False)
        ),
        "signup_verification_bonus_amount": 10.0,
        "referral_code": u.get("referral_code"),
        "referral_count": int(u.get("referral_count", 0)),
        "referral_earnings_usd": round(
            int(u.get("referral_earnings_cents", 0)) / 100.0, 2
        ),
    }


def _reset_login_failures(email: str):
    _AUTH_FAILURES.pop(email, None)


def _login_failure_count(email: str) -> int:
    now = datetime.now(timezone.utc)
    attempts = _AUTH_FAILURES.get(email, [])
    attempts = [ts for ts in attempts if (now - ts).total_seconds() < AUTH_FAILURE_WINDOW_SECONDS]
    if len(attempts) != len(_AUTH_FAILURES.get(email, [])):
        _AUTH_FAILURES[email] = attempts
    return len(attempts)


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


def get_public_slot_machine(machine_id: str):
    if machine_id not in PUBLIC_SLOT_IDS:
        raise HTTPException(status_code=404, detail="Machine not found")
    machine = SLOT_MACHINES.get(machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    return machine


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


def safe_support_reply(text: str) -> str:
    """Return a safe support response while blocking payout-performance leaks.

    The platform must never expose which machine is hot, which bet is winning,
    current payout bias, or internal payout analytics to players or support chat.
    """
    cleaned = (text or "").strip()
    if not cleaned:
        return "Hi — I'm the 24/7 assistant. Try 'deposit', 'withdraw', or 'verify'. For urgent support, open a support ticket so the HQ team can review it."

    lower = cleaned.lower()

    leakage_phrases = (
        "paying the most",
        "payout pattern",
        "hot today",
        "hot or cold",
        "which machine",
        "machine is paying",
        "which slot is paying",
        "what is the current payout",
        "winning bet",
        "machine performance",
        "payout bias",
        "payout trend",
        "hot streak",
        "cold streak",
        "most profitable",
        "which bet is winning",
        "slot is hot",
    )
    if any(phrase in lower for phrase in leakage_phrases):
        return (
            "I can help with deposits, withdrawals, verification, and account support, but "
            "I can’t provide live performance or betting-pattern insights. "
            "If you need help with your wallet or account, I can guide you safely."
        )

    if "deposit" in lower or "cashier" in lower:
        return "To deposit, open Wallet → Cashier. We accept Card (Stripe) and Crypto. For help, tell me which you want."
    if "withdraw" in lower or "payout" in lower:
        return "Withdrawals route via the approval vault. Check /profile or /wallet → Transactions for status."
    if "kyc" in lower or "id" in lower or "verify" in lower:
        return "KYC is required before large withdrawals. Use the Verification page to upload documents and complete your banking verification."
    if "balance" in lower or "wallet" in lower or "account" in lower:
        return "For wallet or account help, open your profile and check the balance, transactions, and verification status."
    if "support" in lower or "help" in lower:
        return "I can assist with deposits, withdrawals, verification, and basic account questions. For sensitive cases, an admin review can be requested."

    return "Hi — I'm the 24/7 assistant. Try 'deposit', 'withdraw', or 'verify'. For urgent support, open a support ticket so the HQ team can review it."


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

    reply = safe_support_reply(text)

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


def _make_mock_verification_session() -> dict:
    sid = "vs_" + uuid.uuid4().hex[:16]
    return {
        "id": sid,
        "url": f"https://verify.stripe.com/{sid}",
        "status": "requires_input",
    }


class KycSessionInput(BaseModel):
    origin_url: Optional[str] = None


class KycBankingDetailsInput(BaseModel):
    account_holder: str = Field(min_length=2)
    bank_name: str = Field(min_length=2)
    bank_country: str = Field(min_length=2)
    account_number: str = Field(min_length=4)
    bsb_code: Optional[str] = None
    routing_number: Optional[str] = None
    iban: Optional[str] = None
    swift_code: Optional[str] = None
    address_line1: Optional[str] = None

    @classmethod
    def validate_details(cls, details: "KycBankingDetailsInput") -> None:
        if details.iban:
            if len(details.iban.replace(" ", "")) < 8:
                raise ValueError("IBAN is invalid")
            return
        country = (details.bank_country or "").upper()
        if country in {"AU", "AUS", "AUSTRALIA"}:
            if not details.bsb_code:
                raise ValueError("BSB code is required for Australian bank accounts")
        elif country in {"US", "USA", "UNITED STATES"}:
            if not details.routing_number:
                raise ValueError("Routing number is required for US bank accounts")
        elif country in {"GB", "UK", "GBR", "UNITED KINGDOM"}:
            if not details.swift_code and not details.account_number:
                raise ValueError("Bank details are incomplete for UK accounts")
        if not details.account_number:
            raise ValueError("Account number is required")


@api.post("/kyc/banking")
async def kyc_banking(payload: KycBankingDetailsInput, user: dict = Depends(require_user)):
    try:
        KycBankingDetailsInput.validate_details(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    masked = {
        "account_holder": payload.account_holder.strip(),
        "bank_name": payload.bank_name.strip(),
        "bank_country": payload.bank_country.strip(),
        "account_number_last4": _mask_financial_value(payload.account_number),
        "bsb_last4": _mask_financial_value(payload.bsb_code),
        "routing_last4": _mask_financial_value(payload.routing_number),
        "iban_last4": _mask_financial_value(payload.iban),
        "swift_last4": _mask_financial_value(payload.swift_code),
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {
                "kyc_banking_details": masked,
                "kyc_banking_verified": False,
                "kyc_banking_status": "submitted",
            }
        },
    )
    return {"ok": True, "banking_verified": False, "banking_status": "submitted"}


@api.get("/kyc/banking")
async def kyc_banking_get(user: dict = Depends(require_user)):
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    details = fresh.get("kyc_banking_details") or {}
    return {
        "banking_verified": bool(fresh.get("kyc_banking_verified")),
        "banking_status": fresh.get("kyc_banking_status", "not_started"),
        "details": details,
    }


@api.post("/kyc/session")
async def kyc_session(payload: KycSessionInput, user: dict = Depends(require_user)):
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if fresh.get("kyc_approved"):
        return {"already_approved": True}
    origin = _safe_frontend_origin(payload.origin_url)
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
        msg = str(e).lower()
        if (
            "not set up to use identity" in msg
            or "identity" in msg and "not set up" in msg
            or "identity is not enabled" in msg
            or "does not support identity" in msg
        ):
            logger.warning(
                "Stripe Identity not configured for account; using safe mock verification session. Details: %s",
                e,
            )
            session = type("_MockVerificationSessionObj", (), {})()
            session.id = "vs_" + uuid.uuid4().hex[:16]
            session.url = f"https://verify.stripe.com/{session.id}"
            session.status = "requires_input"
        else:
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
        "banking_verified": bool(fresh.get("kyc_banking_verified")),
        "banking_status": fresh.get("kyc_banking_status", "not_started"),
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

    outcome = None
    payout = 0.0
    if payload.mode == "color":
        # 50/50 chance (cryptographically secure)
        pick = secrets.choice(["red", "black"])
        if pick == payload.choice:
            payout = round(amt * 2.0, 2)
            outcome = "win"
        else:
            outcome = "lose"
    else:
        # suit: 1/4 chance -> 4x payout
        pick = secrets.choice(["hearts", "diamonds", "clubs", "spades"])
        if pick == payload.choice:
            payout = round(amt * 4.0, 2)
            outcome = "win"
        else:
            outcome = "lose"

    if payout > 0:
        await adjust_balance(user["user_id"], payout)
        await record_house_cashflow(
            payout,
            "player_payout",
            "gamble_win",
            {"user_id": user["user_id"], "mode": payload.mode, "choice": payload.choice},
        )
        await record_transaction(
            user["user_id"],
            "gamble_win",
            payout,
            {"mode": payload.mode, "choice": payload.choice},
        )
    else:
        await record_house_cashflow(
            amt,
            "house_win",
            "gamble_loss",
            {"user_id": user["user_id"], "mode": payload.mode, "choice": payload.choice},
        )
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

            # SOLVENCY GUARD: never release more than the vault can cover.
            # VAULT_MIN_RESERVE_USD keeps a float in the bank so the casino
            # stays solvent while still paying genuine wins.
            reserve_cents = int(round(float(os.environ.get("VAULT_MIN_RESERVE_USD", "0")) * 100))
            summary = await get_house_bankroll_summary()
            available_cents = int(summary.get("available_cents", 0))

            for t in pending:
                claimed = await db.cashier_transactions.find_one_and_update(
                    {"id": t["id"], "direction": "withdrawal", "status": "pending"},
                    {"$set": {"status": "processing", "updated_at": datetime.now(timezone.utc).isoformat()}},
                    projection={"_id": 0},
                )
                if not claimed:
                    continue
                t = claimed
                now_iso = datetime.now(timezone.utc).isoformat()
                amt_cents = int(round(float(t.get("amount_usd", 0) or 0) * 100))

                # Hold the payout if the vault lacks the funds to cover it.
                if available_cents - amt_cents < reserve_cents:
                    await db.cashier_transactions.update_one(
                        {"id": t["id"], "status": "processing"},
                        {"$set": {
                            "status": "pending",
                            "vault_hold": True,
                            "hold_reason": "insufficient_vault_balance",
                            "updated_at": now_iso,
                        }},
                    )
                    logger.warning(
                        "WITHDRAWAL HELD id=%s amount_usd=%.2f vault_available_usd=%.2f (insufficient vault funds)",
                        t.get("id"),
                        float(t.get("amount_usd", 0) or 0),
                        available_cents / 100.0,
                    )
                    continue

                # attempt submit to vault
                try:
                    res = await cashier.vault_submit_withdrawal(
                        t.get("currency", "USD"),
                        t.get("amount_usd", 0),
                        t.get("destination", ""),
                        t.get("id"),
                    )
                    if res.get("ok"):
                        available_cents -= amt_cents  # reserve the released funds
                        await db.cashier_transactions.update_one(
                            {"id": t["id"]},
                            {
                                "$set": {
                                    "status": "processing",
                                    "vault_id": res.get("vault_id"),
                                    "vault_hold": False,
                                    "hold_reason": None,
                                    "updated_at": now_iso,
                                }
                            },
                        )
                    else:
                        # keep pending; vault may be temporarily unavailable
                        await db.cashier_transactions.update_one(
                            {"id": t["id"], "status": "processing"},
                            {"$set": {"status": "pending", "updated_at": now_iso}},
                        )
                except Exception:
                    await db.cashier_transactions.update_one(
                        {"id": t["id"], "status": "processing"},
                        {"$set": {
                            "status": "pending",
                            "vault_detail": "Withdrawal worker retry scheduled",
                            "updated_at": now_iso,
                        }},
                    )
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
    ref_code: Optional[str] = None


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


class WowKenoInput(BaseModel):
    picks: List[int]
    stake: float = Field(gt=0)


class SideKenoInput(BaseModel):
    bets: Dict[str, str]
    stake: float = Field(gt=0)


class CoinFlipInput(BaseModel):
    side: str
    bet: float = Field(gt=0)


class SharkFlipInput(BaseModel):
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

    referred_by = None
    if payload.ref_code:
        ref = await db.users.find_one(
            {"referral_code": payload.ref_code.strip().upper()}
        )
        if ref and ref.get("user_id") != user_id:
            referred_by = ref["user_id"]

    referral_code = await _generate_unique_referral_code()

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
        "signup_verification_bonus_claimed": False,
        "last_cashback_at": datetime.now(timezone.utc).isoformat(),
        "cashback_wagered_snapshot": 0.0,
        "cashback_won_snapshot": 0.0,
        "referral_code": referral_code,
        "referred_by": referred_by,
        "referral_reward_paid": False,
        "referral_count": 0,
        "referral_earnings_cents": 0,
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

    valid = bool(u and u.get("password_hash") and verify_password(payload.password, u["password_hash"]))
    if valid:
        _reset_login_failures(email)
        token = create_access_token(u["user_id"], email)
        set_auth_cookie(response, token)
        return {"user": public_user(u), "token": token}

    attempts = _AUTH_FAILURES.get(email, [])
    now = datetime.now(timezone.utc)
    attempts = [ts for ts in attempts if (now - ts).total_seconds() < AUTH_FAILURE_WINDOW_SECONDS]
    attempts.append(now)
    _AUTH_FAILURES[email] = attempts
    if len(attempts) >= AUTH_FAILURE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many failed login attempts")
    raise HTTPException(status_code=401, detail="Invalid email or password")


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


@api.get("/referral/me")
async def referral_me(user: dict = Depends(require_user)):
    fresh = await db.users.find_one({"user_id": user["user_id"]})
    code = fresh.get("referral_code")
    if not code:
        code = await _ensure_referral_code(user["user_id"])
    total_signups = await db.users.count_documents(
        {"referred_by": user["user_id"]}
    )
    converted = await db.users.count_documents(
        {"referred_by": user["user_id"], "referral_reward_paid": True}
    )
    earnings_cents = int(fresh.get("referral_earnings_cents", 0))
    return {
        "referral_code": code,
        "reward_usd": REFERRAL_REWARD_CENTS / 100.0,
        "total_referrals": total_signups,
        "converted_referrals": converted,
        "earnings_usd": round(earnings_cents / 100.0, 2),
    }


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
            "signup_verification_bonus_claimed": False,
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
    m = get_public_slot_machine(payload.machine_id)
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
    await add_tournament_score(user, result["total_win"])

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
    result["win"] = round(result["total_win"], 2)
    result["payout"] = round(result["total_win"], 2)
    result["balance"] = round(updated["balance"], 2)
    result["net"] = round(net, 2)
    return result


BUY_FEATURE_COST_MULT = 100  # buy the free-spins bonus for 100x the total bet


@api.post("/games/slots/buy-bonus")
async def slots_buy_bonus(payload: SpinInput, user: dict = Depends(require_user)):
    """Buy Feature — pay 100x the bet to instantly trigger the free-spins bonus."""
    m = get_public_slot_machine(payload.machine_id)
    if payload.bet < 20:
        raise HTTPException(status_code=400, detail="Minimum bet is 20 credits")
    spins = int(m.get("free_spins", 0) or 0)
    if spins <= 0:
        raise HTTPException(
            status_code=400,
            detail="This machine has no buyable free-spins feature",
        )
    cost = round(payload.bet * BUY_FEATURE_COST_MULT, 2)
    if user.get("balance", 0) < cost:
        raise HTTPException(
            status_code=400,
            detail=f"Need {int(cost)} credits to buy the feature",
        )
    updated = await adjust_balance(
        user["user_id"], delta_balance=-cost, wagered=cost, played=1
    )
    await record_transaction(
        user["user_id"],
        "buy_feature",
        -cost,
        {"machine": payload.machine_id, "bet": payload.bet, "spins": spins},
    )
    session_id = str(uuid.uuid4())
    await db.free_spins.insert_one(
        {
            "session_id": session_id,
            "user_id": user["user_id"],
            "machine_id": payload.machine_id,
            "bet": payload.bet,
            "spins_total": spins,
            "spins_left": spins,
            "multiplier": 1,
            "total_win": 0.0,
            "active": True,
            "bought": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    return {
        "free_session": {
            "session_id": session_id,
            "spins_left": spins,
            "multiplier": 1,
        },
        "cost": cost,
        "balance": round(updated["balance"], 2),
    }


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
        await add_tournament_score(user, win)

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
    await add_tournament_score(user, result["total_win"])

    result["balance"] = round(updated["balance"], 2)
    return result


# ---------------------------------------------------------------------------
# Keno
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
    if result["win"] > payload.stake:
        await record_house_cashflow(
            result["win"] - payload.stake,
            "player_payout",
            "keno_win",
            {"user_id": user["user_id"], "picks": result["picks"], "stake": payload.stake},
        )
    elif payload.stake > 0:
        await record_house_cashflow(
            payload.stake,
            "house_win",
            "keno_loss",
            {"user_id": user["user_id"], "picks": result["picks"], "stake": payload.stake},
        )
    await record_transaction(
        user["user_id"],
        "keno",
        net,
        {"picks": result["picks"], "stake": payload.stake, "win": result["win"]},
    )
    await add_tournament_score(user, result["win"])
    result["balance"] = round(updated["balance"], 2)
    result["net"] = round(net, 2)
    return result


@api.post("/games/keno/wow")
async def wow_keno_play(payload: WowKenoInput, user: dict = Depends(require_user)):
    if payload.stake < 10:
        raise HTTPException(status_code=400, detail="Minimum stake is 10 credits")
    if user.get("balance", 0) < payload.stake:
        raise HTTPException(status_code=400, detail="Insufficient credits")
    try:
        result = play_wow_keno(payload.picks, payload.stake)
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
    if result["win"] > payload.stake:
        await record_house_cashflow(
            result["win"] - payload.stake,
            "player_payout",
            "keno_wow_win",
            {"user_id": user["user_id"], "picks": result["picks"], "stake": payload.stake},
        )
    elif payload.stake > 0:
        await record_house_cashflow(
            payload.stake,
            "house_win",
            "keno_wow_loss",
            {"user_id": user["user_id"], "picks": result["picks"], "stake": payload.stake},
        )
    await record_transaction(
        user["user_id"],
        "keno_wow",
        net,
        {"picks": result["picks"], "stake": payload.stake, "win": result["win"]},
    )
    await add_tournament_score(user, result["win"])
    result["balance"] = round(updated["balance"], 2)
    result["net"] = round(net, 2)
    return result


@api.post("/games/keno/side")
async def side_keno_play(payload: SideKenoInput, user: dict = Depends(require_user)):
    if payload.stake < 10:
        raise HTTPException(status_code=400, detail="Minimum stake is 10 credits per bet")
    try:
        result = play_side_keno(payload.bets)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    num_legs = len(result["legs"])
    total_stake = round(payload.stake * num_legs, 2)
    if user.get("balance", 0) < total_stake:
        raise HTTPException(status_code=400, detail="Insufficient credits")
    total_win = round(
        sum(payload.stake * result["leg_payout"] for leg in result["legs"] if leg["won"]),
        2,
    )
    net = round(total_win - total_stake, 2)
    updated = await adjust_balance(
        user["user_id"],
        delta_balance=net,
        wagered=total_stake,
        won=total_win,
        biggest=total_win,
        played=1,
    )
    if total_win > total_stake:
        await record_house_cashflow(
            total_win - total_stake,
            "player_payout",
            "keno_side_win",
            {"user_id": user["user_id"], "bets": payload.bets, "stake": total_stake},
        )
    elif total_stake > 0:
        await record_house_cashflow(
            total_stake,
            "house_win",
            "keno_side_loss",
            {"user_id": user["user_id"], "bets": payload.bets, "stake": total_stake},
        )
    await record_transaction(
        user["user_id"],
        "keno_side",
        net,
        {"bets": payload.bets, "stake": total_stake, "win": total_win},
    )
    await add_tournament_score(user, total_win)
    result["stake"] = payload.stake
    result["total_stake"] = total_stake
    result["win"] = total_win
    result["balance"] = round(updated["balance"], 2)
    result["net"] = net
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
    if win > 0:
        await record_house_cashflow(
            win,
            "player_payout",
            "coinflip_win",
            {"user_id": user["user_id"], "side": payload.side, "outcome": outcome},
        )
    else:
        await record_house_cashflow(
            payload.bet,
            "house_win",
            "coinflip_loss",
            {"user_id": user["user_id"], "side": payload.side, "outcome": outcome},
        )
    await record_transaction(
        user["user_id"],
        "coinflip",
        net,
        {"side": payload.side, "outcome": outcome, "bet": payload.bet, "win": win},
    )
    await add_tournament_score(user, win)
    return {
        "outcome": outcome,
        "win": round(win, 2),
        "net": round(net, 2),
        "balance": round(updated["balance"], 2),
    }


@api.post("/games/shark/flip")
async def shark_flip(payload: SharkFlipInput, user: dict = Depends(require_user)):
    if payload.bet < 10:
        raise HTTPException(status_code=400, detail="Minimum bet is 10 credits")
    if user.get("balance", 0) < payload.bet:
        raise HTTPException(status_code=400, detail="Insufficient credits")
    # ~94% RTP: evens 3.3% (3x), heads 21% (2x), tails 21% (2x), split/lose 54.7%
    r = secrets.randbelow(1000)
    if r < 33:
        outcome, mult = "evens", 3.0
    elif r < 243:
        outcome, mult = "heads", 2.0
    elif r < 453:
        outcome, mult = "tails", 2.0
    else:
        outcome, mult = "split", 0.0
    streak = int(user.get("shark_streak", 0) or 0)
    jackpot = False
    if mult > 0:
        streak += 1
        win = round(payload.bet * mult, 2)
        if streak >= 5:
            jackpot = True
            win = round(win + payload.bet * 5, 2)  # streak jackpot bonus
            streak = 0
    else:
        streak = 0
        win = 0.0
    net = win - payload.bet
    updated = await adjust_balance(
        user["user_id"],
        delta_balance=net,
        wagered=payload.bet,
        won=win,
        biggest=win,
        played=1,
    )
    await db.users.update_one(
        {"user_id": user["user_id"]}, {"$set": {"shark_streak": streak}}
    )
    if win > 0:
        await record_house_cashflow(
            win,
            "player_payout",
            "shark_win",
            {"user_id": user["user_id"], "outcome": outcome, "bet": payload.bet},
        )
    else:
        await record_house_cashflow(
            payload.bet,
            "house_win",
            "shark_loss",
            {"user_id": user["user_id"], "outcome": outcome, "bet": payload.bet},
        )
    await record_transaction(
        user["user_id"],
        "shark_splitters",
        net,
        {"outcome": outcome, "bet": payload.bet, "win": win, "jackpot": jackpot},
    )
    await add_tournament_score(user, win)
    return {
        "outcome": outcome,
        "multiplier": mult,
        "win": win,
        "net": round(net, 2),
        "balance": round(updated["balance"], 2),
        "streak": streak,
        "jackpot": jackpot,
    }


# ---------------------------------------------------------------------------
# Signup + verify bonus (casino-safe terms)
# ---------------------------------------------------------------------------
SIGNUP_VERIFY_BONUS_AMOUNT = 10.0

@api.get("/bonus/verify-status")
async def signup_verify_bonus_status(user: dict = Depends(require_user)):
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    claimed = bool(fresh.get("signup_verification_bonus_claimed", False))
    eligible = bool(fresh.get("kyc_approved", False)) and not claimed
    return {
        "amount": SIGNUP_VERIFY_BONUS_AMOUNT,
        "claimed": claimed,
        "eligible": eligible,
        "kyc_approved": bool(fresh.get("kyc_approved", False)),
        "terms": {
            "wagering": "10x slots only within 30 days",
            "min_kyc_required": True,
            "max_cashout": 10.0,
            "bonus_is_promotional_credit": True,
            "non_withdrawable_as_cash": True,
            "one_claim_per_account": True,
            "no_stack_with_other_bonus_offers": True,
        },
    }


@api.post("/bonus/verify")
async def signup_verify_bonus_claim(user: dict = Depends(require_user)):
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if fresh.get("signup_verification_bonus_claimed", False):
        raise HTTPException(status_code=400, detail="Signup verification bonus already claimed")
    if not fresh.get("kyc_approved", False):
        raise HTTPException(
            status_code=403,
            detail="Complete identity verification to unlock the $10 signup bonus.",
        )

    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$inc": {"balance": SIGNUP_VERIFY_BONUS_AMOUNT}, "$set": {"signup_verification_bonus_claimed": True}},
    )
    await record_transaction(
        user["user_id"],
        "signup_verify_bonus",
        SIGNUP_VERIFY_BONUS_AMOUNT,
        {"note": "Verified signup bonus; 10x slots-only wagering, max cashout $10"},
    )
    updated = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {
        "claimed": SIGNUP_VERIFY_BONUS_AMOUNT,
        "balance": round(updated["balance"], 2),
        "terms": {
            "wagering": "10x slots only within 30 days",
            "min_kyc_required": True,
            "max_cashout": 10.0,
            "bonus_is_promotional_credit": True,
            "non_withdrawable_as_cash": True,
            "one_claim_per_account": True,
            "no_stack_with_other_bonus_offers": True,
        },
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
# Daily Streak Wheel (additional daily reward, separate from Supply Drop)
# ---------------------------------------------------------------------------
# ── Wheel of Wealth ──────────────────────────────────────────────────────
# Cash segments in dollars + two "Better Luck" + one "Spin Again" (13 total).
WHEEL_OF_WEALTH = [
    {"label": "$5", "value": 5, "type": "cash"},
    {"label": "$10", "value": 10, "type": "cash"},
    {"label": "$15", "value": 15, "type": "cash"},
    {"label": "$20", "value": 20, "type": "cash"},
    {"label": "$25", "value": 25, "type": "cash"},
    {"label": "$30", "value": 30, "type": "cash"},
    {"label": "$35", "value": 35, "type": "cash"},
    {"label": "$40", "value": 40, "type": "cash"},
    {"label": "$45", "value": 45, "type": "cash"},
    {"label": "$50", "value": 50, "type": "cash"},
    {"label": "BETTER LUCK", "value": 0, "type": "luck"},
    {"label": "BETTER LUCK", "value": 0, "type": "luck"},
    {"label": "SPIN AGAIN", "value": 0, "type": "again"},
]
WHEEL_OF_WEALTH_WEIGHTS = [26, 20, 14, 9, 6, 4, 3, 2, 1, 1, 30, 30, 8]
WHEEL_BIG_DEPOSIT_USD = 500  # a single deposit OVER this earns 1 spin
WHEEL_MILESTONE_USD = 1000  # every $1000 of lifetime deposits earns 1 spin


async def _grant_wheel_spins_on_deposit(user_id: str, deposit_usd: float):
    """Award Wheel of Wealth spins: +1 for any single deposit over $500, and
    +1 for each $1000 lifetime-deposit milestone newly crossed. Idempotent per
    deposit because it is called exactly once from each credit path."""
    u = await db.users.find_one({"user_id": user_id})
    if not u:
        return
    prev_total = float(u.get("total_deposited_usd", 0.0))
    new_total = prev_total + float(deposit_usd)
    granted = 1 if float(deposit_usd) > WHEEL_BIG_DEPOSIT_USD else 0
    granted += int(new_total // WHEEL_MILESTONE_USD) - int(
        prev_total // WHEEL_MILESTONE_USD
    )
    await db.users.update_one(
        {"user_id": user_id},
        {
            "$set": {"total_deposited_usd": round(new_total, 2)},
            "$inc": {"wheel_spins": max(0, granted)},
        },
    )


@api.get("/wheel/status")
async def wheel_status(user: dict = Depends(require_user)):
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    spins = int(fresh.get("wheel_spins", 0))
    total_dep = float(fresh.get("total_deposited_usd", 0.0))

    last_spin = fresh.get("last_wheel_spin_at")
    if isinstance(last_spin, str):
        try:
            last_spin_dt = datetime.fromisoformat(last_spin)
            if last_spin_dt.tzinfo is None:
                last_spin_dt = last_spin_dt.replace(tzinfo=timezone.utc)
        except ValueError:
            last_spin_dt = None
    else:
        last_spin_dt = last_spin

    if last_spin_dt is None:
        seconds_left = 0
        cooldown_active = False
    else:
        now = datetime.now(timezone.utc)
        seconds_left = max(0, int((last_spin_dt + timedelta(days=1) - now).total_seconds()))
        cooldown_active = seconds_left > 0

    streak = int(fresh.get("wheel_streak", fresh.get("daily_wheel_streak", 0)) or 0)
    next_multiplier = 2 if streak and streak % 7 == 0 else 1
    mega_unlocked = streak >= 6
    mega_value = 250000 if mega_unlocked else 0

    legacy_segments = [500, 1000, 2000, 5000, 10000, 15000, 25000, 35000, 50000]
    legacy_segment_meta = [
        {"label": "$500", "value": 500, "type": "cash"},
        {"label": "$1,000", "value": 1000, "type": "cash"},
        {"label": "$2,000", "value": 2000, "type": "cash"},
        {"label": "$5,000", "value": 5000, "type": "cash"},
        {"label": "$10,000", "value": 10000, "type": "cash"},
        {"label": "$15,000", "value": 15000, "type": "cash"},
        {"label": "$25,000", "value": 25000, "type": "cash"},
        {"label": "$35,000", "value": 35000, "type": "cash"},
        {"label": "$50,000", "value": 50000, "type": "cash"},
    ]
    response = {
        "available": (spins > 0) or (not cooldown_active),
        "spins_available": spins,
        "segments": legacy_segments,
        "segment_meta": legacy_segment_meta,
        "total_deposited_usd": round(total_dep, 2),
        "big_deposit_usd": WHEEL_BIG_DEPOSIT_USD,
        "milestone_usd": WHEEL_MILESTONE_USD,
        "next_milestone_usd": round(
            (int(total_dep // WHEEL_MILESTONE_USD) + 1) * WHEEL_MILESTONE_USD, 2
        ),
        "seconds_left": seconds_left,
        "streak": streak,
        "next_multiplier": next_multiplier,
        "segments_values": legacy_segments,
        "mega_unlocked": mega_unlocked,
        "mega_value": mega_value,
        "next_streak": streak + 1,
    }
    return response


@api.post("/wheel/spin")
async def wheel_spin(user: dict = Depends(require_user)):
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    spins = int(fresh.get("wheel_spins", 0))

    if spins > 0:
        claimed = await db.users.find_one_and_update(
            {"user_id": user["user_id"], "wheel_spins": {"$gte": 1}},
            {"$inc": {"wheel_spins": -1}},
        )
        if not claimed:
            raise HTTPException(
                status_code=400,
                detail="No wheel spins available. Deposit over $500, or reach $1000 in total deposits, to earn a Wheel of Wealth spin.",
            )
        wts = WHEEL_OF_WEALTH_WEIGHTS
        total = sum(wts)
        r = secrets.randbelow(total)
        acc = 0
        idx = len(wts) - 1
        for j, w in enumerate(wts):
            acc += w
            if r < acc:
                idx = j
                break
        seg = WHEEL_OF_WEALTH[idx]
        amount = 0.0
        if seg["type"] == "cash":
            amount = float(seg["value"])
            await db.users.update_one(
                {"user_id": user["user_id"]}, {"$inc": {"balance": amount}}
            )
            await record_transaction(
                user["user_id"], "wheel_win", amount, {"segment": seg["label"]}
            )
        elif seg["type"] == "again":
            await db.users.update_one(
                {"user_id": user["user_id"]}, {"$inc": {"wheel_spins": 1}}
            )
        updated = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
        return {
            "segment_index": idx,
            "label": seg["label"],
            "type": seg["type"],
            "amount": amount,
            "spins_available": int(updated.get("wheel_spins", 0)),
            "balance": round(updated["balance"], 2),
        }

    last_spin = fresh.get("last_wheel_spin_at")
    if isinstance(last_spin, str):
        try:
            last_spin_dt = datetime.fromisoformat(last_spin)
            if last_spin_dt.tzinfo is None:
                last_spin_dt = last_spin_dt.replace(tzinfo=timezone.utc)
        except ValueError:
            last_spin_dt = None
    else:
        last_spin_dt = last_spin

    if last_spin_dt is not None:
        now = datetime.now(timezone.utc)
        if now - last_spin_dt < timedelta(days=1):
            remaining = max(0, int((last_spin_dt + timedelta(days=1) - now).total_seconds()))
            raise HTTPException(
                status_code=400,
                detail=f"Wheel is on cooldown for {remaining} seconds.",
            )

    seg_values = [500, 1000, 2000, 5000, 10000, 15000, 25000, 35000, 50000]
    idx = secrets.randbelow(len(seg_values))
    amount = float(seg_values[idx])
    streak = int(fresh.get("wheel_streak", 0) or 0) + 1
    next_multiplier = 2 if streak and streak % 7 == 0 else 1
    adjusted_amount = round(amount * next_multiplier, 2)
    now_iso = datetime.now(timezone.utc).isoformat()

    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$inc": {"balance": adjusted_amount},
            "$set": {
                "last_wheel_spin_at": now_iso,
                "wheel_streak": streak,
            },
        },
    )
    await record_transaction(
        user["user_id"], "wheel_win", adjusted_amount, {"segment_index": idx, "streak": streak}
    )

    updated = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {
        "segment_index": idx,
        "label": f"${int(amount):,}",
        "type": "cash",
        "amount": adjusted_amount,
        "multiplier": next_multiplier,
        "streak": streak,
        "balance": round(updated["balance"], 2),
        "available": False,
        "seconds_left": 86400,
        "spins_available": 0,
    }


# ---------------------------------------------------------------------------
# Live Tournaments (one always-on 24h rolling event; top 10 share prize pool)
# ---------------------------------------------------------------------------
TOURNAMENT_PRIZE_POOL = 5_000_000  # play credits
TOURNAMENT_SPLIT = [0.30, 0.20, 0.14, 0.10, 0.08, 0.06, 0.045, 0.03, 0.02, 0.015]
TOURNAMENT_DURATION_HOURS = 24
TOURNAMENT_NAME = "OPERATION HIGH ROLLER"


async def _finalize_tournament(t: dict):
    scores = (
        await db.tournament_scores.find({"tournament_id": t["id"]})
        .sort("score", -1)
        .to_list(10)
    )
    winners = []
    for i, s in enumerate(scores):
        if i >= len(TOURNAMENT_SPLIT) or s.get("score", 0) <= 0:
            continue
        share = int(t["prize_pool"] * TOURNAMENT_SPLIT[i])
        if share <= 0:
            continue
        await db.users.update_one(
            {"user_id": s["user_id"]}, {"$inc": {"balance": share}}
        )
        await record_transaction(
            s["user_id"],
            "tournament_prize",
            share,
            {"tournament": t.get("name"), "rank": i + 1},
        )
        winners.append(
            {
                "user_id": s["user_id"],
                "name": s.get("name"),
                "rank": i + 1,
                "prize": share,
                "score": round(s.get("score", 0), 2),
            }
        )
    await db.tournaments.update_one(
        {"id": t["id"]},
        {
            "$set": {
                "status": "finalized",
                "winners": winners,
                "finalized_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )


async def _ensure_tournament() -> dict:
    now = datetime.now(timezone.utc)
    t = await db.tournaments.find_one({"status": "active"})
    if t:
        ends = datetime.fromisoformat(t["ends_at"])
        if ends.tzinfo is None:
            ends = ends.replace(tzinfo=timezone.utc)
        if now < ends:
            return t
        # expired -> claim finalization atomically so only one worker pays out
        claim = await db.tournaments.update_one(
            {"id": t["id"], "status": "active"}, {"$set": {"status": "finalizing"}}
        )
        if claim.modified_count == 1:
            t["status"] = "finalizing"
            await _finalize_tournament(t)
    # create a fresh tournament
    new = {
        "id": str(uuid.uuid4()),
        "name": TOURNAMENT_NAME,
        "status": "active",
        "prize_pool": TOURNAMENT_PRIZE_POOL,
        "started_at": now.isoformat(),
        "ends_at": (now + timedelta(hours=TOURNAMENT_DURATION_HOURS)).isoformat(),
    }
    await db.tournaments.insert_one(dict(new))
    return new


async def add_tournament_score(user: dict, amount: float):
    """Add a player's win to the active tournament leaderboard."""
    if not amount or amount <= 0:
        return
    t = await db.tournaments.find_one({"status": "active"})
    if not t:
        return
    await db.tournament_scores.update_one(
        {"tournament_id": t["id"], "user_id": user["user_id"]},
        {
            "$inc": {"score": round(amount, 2)},
            "$set": {"name": user.get("name", "Operative")},
        },
        upsert=True,
    )


@api.get("/tournament/current")
async def tournament_current(request: Request):
    t = await _ensure_tournament()
    user = await resolve_user(request)
    now = datetime.now(timezone.utc)
    ends = datetime.fromisoformat(t["ends_at"])
    if ends.tzinfo is None:
        ends = ends.replace(tzinfo=timezone.utc)
    top = (
        await db.tournament_scores.find({"tournament_id": t["id"]}, {"_id": 0})
        .sort("score", -1)
        .to_list(10)
    )
    leaderboard = [
        {
            "rank": i + 1,
            "name": s.get("name", "Operative"),
            "score": round(s.get("score", 0), 2),
            "prize": int(t["prize_pool"] * TOURNAMENT_SPLIT[i])
            if i < len(TOURNAMENT_SPLIT)
            else 0,
        }
        for i, s in enumerate(top)
    ]
    me = None
    if user:
        ms = await db.tournament_scores.find_one(
            {"tournament_id": t["id"], "user_id": user["user_id"]}
        )
        if ms:
            higher = await db.tournament_scores.count_documents(
                {"tournament_id": t["id"], "score": {"$gt": ms.get("score", 0)}}
            )
            me = {"rank": higher + 1, "score": round(ms.get("score", 0), 2)}
        else:
            me = {"rank": None, "score": 0}
    return {
        "id": t["id"],
        "name": t["name"],
        "prize_pool": t["prize_pool"],
        "ends_at": t["ends_at"],
        "seconds_left": max(0, int((ends - now).total_seconds())),
        "leaderboard": leaderboard,
        "me": me,
    }


@api.get("/tournament/champions")
async def tournament_champions():
    """Hall of Fame — winners of the most recently finalized tournament."""
    last = await db.tournaments.find_one(
        {"status": "finalized", "winners": {"$exists": True, "$ne": []}},
        {"_id": 0},
        sort=[("finalized_at", -1)],
    )
    if not last:
        return {"has_history": False, "champions": []}
    return {
        "has_history": True,
        "name": last.get("name"),
        "finalized_at": last.get("finalized_at"),
        "prize_pool": last.get("prize_pool"),
        "champions": [
            {
                "rank": w.get("rank"),
                "name": w.get("name", "Operative"),
                "prize": w.get("prize", 0),
                "score": w.get("score", 0),
            }
            for w in (last.get("winners") or [])
        ],
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


DEFAULT_UPGRADES = [
    {
        "id": f"pkg-{i + 1}",
        "name": f"Fleet Upgrade {i + 1}",
        "description": f"Enhancement package {i + 1} — custom configuration available.",
        "price_usd": 499 + i * 10 if i % 5 == 0 else 99 + i * 20,
        "active": i < 8,
        "published": i < 3,
    }
    for i in range(21)
]


async def _load_upgrade_catalog():
    doc = await db.upgrades.find_one({"_id": "catalog"}, {"_id": 0, "packages": 1})
    if doc and isinstance(doc.get("packages"), list):
        return doc["packages"]
    await db.upgrades.update_one(
        {"_id": "catalog"},
        {"$setOnInsert": {"packages": DEFAULT_UPGRADES, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return DEFAULT_UPGRADES


@api.get("/upgrades")
async def public_upgrades():
    packages = await _load_upgrade_catalog()
    return packages


@api.get("/admin/upgrades")
async def admin_get_upgrades(admin: dict = Depends(require_admin)):
    packages = await _load_upgrade_catalog()
    return packages


@api.post("/admin/upgrades")
async def admin_set_upgrades(
    payload: List[dict], admin: dict = Depends(require_admin)
):
    if not isinstance(payload, list):
        raise HTTPException(status_code=400, detail="Expected a list of upgrade packages")
    cleaned = []
    for entry in payload:
        if not isinstance(entry, dict):
            continue
        cleaned.append(
            {
                "id": str(entry.get("id") or uuid.uuid4().hex),
                "name": str(entry.get("name") or "Fleet Upgrade"),
                "description": str(
                    entry.get("description")
                    or "Enhancement package — custom configuration available."
                ),
                "price_usd": float(entry.get("price_usd", 0.0) or 0.0),
                "active": bool(entry.get("active", False)),
                "published": bool(entry.get("published", False)),
            }
        )
    if not cleaned:
        raise HTTPException(status_code=400, detail="No valid upgrade packages supplied")
    await db.upgrades.update_one(
        {"_id": "catalog"},
        {"$set": {"packages": cleaned, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return cleaned


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
    bankroll = await get_house_bankroll_summary()
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
        "house_bankroll_usd": bankroll["bankroll_usd"],
        "house_payout_coverage_usd": bankroll["available_usd"],
        "house_coverage_ratio": bankroll["coverage_ratio"],
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


# ---------------------------------------------------------------------------
# Support tickets ("Contact Management") + PIN-protected HQ Inbox
# ---------------------------------------------------------------------------
HQ_PIN = os.environ.get("HQ_PIN", "")


class SupportTicketInput(BaseModel):
    name: str
    email: str
    subject: Optional[str] = None
    message: str


def _check_hq_pin(request: Request):
    pin = request.headers.get("X-HQ-Pin", "")
    if not HQ_PIN or pin != HQ_PIN:
        raise HTTPException(status_code=403, detail="Invalid HQ PIN")


@api.post("/support/ticket")
async def support_ticket(payload: SupportTicketInput, request: Request):
    user = await resolve_user(request)
    doc = {
        "id": str(uuid.uuid4()),
        "name": payload.name.strip(),
        "email": payload.email.lower().strip(),
        "subject": (payload.subject or "General enquiry").strip(),
        "message": payload.message.strip(),
        "user_id": user["user_id"] if user else None,
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.support_tickets.insert_one(doc)
    return {"ok": True, "id": doc["id"]}


@api.get("/support/tickets")
async def support_tickets(request: Request, admin: dict = Depends(require_admin)):
    _check_hq_pin(request)
    return (
        await db.support_tickets.find({}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(300)
    )


@api.post("/support/tickets/{ticket_id}/resolve")
async def support_resolve(
    ticket_id: str, request: Request, admin: dict = Depends(require_admin)
):
    _check_hq_pin(request)
    res = await db.support_tickets.update_one(
        {"id": ticket_id},
        {"$set": {"status": "resolved", "resolved_at": datetime.now(timezone.utc).isoformat()}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"ok": True}


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

    existing = await db.payment_transactions.find_one(
        {
            "user_id": user["user_id"],
            "lookup_key": pkg["lookup_key"],
            "credited": False,
            "payment_status": {"$ne": "paid"},
        },
        {"_id": 0, "session_id": 1},
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="This credit package is already in progress for your account.",
        )

    origin = _safe_frontend_origin(payload.origin_url)
    try:
        price = _ensure_price(pkg)
        total_credits = pkg["credits"] + pkg.get("bonus", 0)
        kwargs = dict(
            line_items=[{"price": price.id, "quantity": 1}],
            mode="payment",
            success_url=f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{origin}/wallet",
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
        except Exception as e:
            msg = str(e).lower()
            if "managed payments" in msg or "ineligible" in msg:
                session = stripe.checkout.Session.create(
                    **kwargs,
                    automatic_tax={"enabled": True},
                    billing_address_collection="required",
                )
            else:
                raise
    except Exception as e:
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


def _gen_referral_code():
    return "WOW" + uuid.uuid4().hex[:6].upper()


async def _generate_unique_referral_code():
    for _ in range(6):
        code = _gen_referral_code()
        if not await db.users.find_one({"referral_code": code}):
            return code
    return "WOW" + uuid.uuid4().hex[:10].upper()


async def _ensure_referral_code(user_id: str) -> str:
    code = await _generate_unique_referral_code()
    await db.users.update_one(
        {"user_id": user_id}, {"$set": {"referral_code": code}}
    )
    return code


async def _maybe_pay_referral(user_id: str):
    """Pay the referrer a one-time $5 real-balance bonus on their friend's FIRST
    deposit. Fully idempotent — the referred user's `referral_reward_paid` flag is
    claimed atomically so the bonus can never be paid twice, even if called from
    multiple deposit-credit paths (Stripe / crypto / package)."""
    referred = await db.users.find_one_and_update(
        {
            "user_id": user_id,
            "referred_by": {"$nin": [None, ""]},
            "referral_reward_paid": {"$ne": True},
        },
        {
            "$set": {
                "referral_reward_paid": True,
                "first_deposit_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )
    if not referred:
        return
    referrer_id = referred.get("referred_by")
    if not referrer_id or referrer_id == user_id:
        return
    referrer = await db.users.find_one({"user_id": referrer_id})
    if not referrer:
        return
    await db.users.update_one(
        {"user_id": referrer_id},
        {
            "$inc": {
                "real_balance_cents": REFERRAL_REWARD_CENTS,
                "referral_earnings_cents": REFERRAL_REWARD_CENTS,
                "referral_count": 1,
            }
        },
    )
    await record_house_cashflow(
        REFERRAL_REWARD_CENTS / 100.0,
        "referral_bonus",
        "referral_reward",
        {"referrer_id": referrer_id, "referred_id": user_id},
    )
    await record_transaction(
        referrer_id,
        "referral_bonus",
        REFERRAL_REWARD_CENTS / 100.0,
        {"referred_user": user_id, "referred_email": referred.get("email")},
    )


async def _credit_if_paid(record):
    if record.get("payment_status") != "paid":
        return
    if record.get("credited"):
        return

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
        await record_house_cashflow(
            usd_cents / 100.0,
            "deposit",
            "cashier_deposit",
            {"user_id": record["user_id"], "session_id": record["session_id"]},
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
        await _maybe_pay_referral(record["user_id"])
        await _grant_wheel_spins_on_deposit(record["user_id"], usd_cents / 100.0)
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
        await _maybe_pay_referral(record["user_id"])
        await _grant_wheel_spins_on_deposit(
            record["user_id"], record["amount"] / 100.0
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
        "max_deposit_aud": cashier.MAX_DEPOSIT_AUD,
        "min_withdraw_aud": cashier.MIN_WITHDRAW_AUD,
        "max_withdraw_aud": cashier.MAX_WITHDRAW_AUD,
        "min_deposit_usd": round(cashier.MIN_DEPOSIT_USD_CENTS / 100.0, 2),
        "max_deposit_usd": round(cashier.MAX_DEPOSIT_USD_CENTS / 100.0, 2),
        "min_withdraw_usd": round(cashier.MIN_WITHDRAW_USD_CENTS / 100.0, 2),
        "max_withdraw_usd": round(cashier.MAX_WITHDRAW_USD_CENTS / 100.0, 2),
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
    if usd_cents > cashier.MAX_DEPOSIT_USD_CENTS:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum deposit is {cashier.MAX_DEPOSIT_AUD} AUD per transaction",
        )
    minor = cashier.to_minor_unit(payload.amount, code)
    origin = _safe_frontend_origin(payload.origin_url)
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
            success_url=f"{origin}/cashier?deposit=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{origin}/cashier?deposit=cancel",
            metadata={
                "kind": "cashier_deposit",
                "user_id": user["user_id"],
                "usd_cents": str(usd_cents),
                "currency": code,
            },
        )
    except Exception as e:
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
    if usd_cents > cashier.MAX_DEPOSIT_USD_CENTS:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum deposit is {cashier.MAX_DEPOSIT_AUD} AUD per transaction",
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
        await record_house_cashflow(
            t["amount_usd_cents"] / 100.0,
            "deposit",
            "crypto_deposit_completed",
            {"user_id": t["user_id"], "payment_id": payment_id},
        )
        await record_transaction(
            t["user_id"],
            "deposit_crypto",
            t["amount_usd_cents"] / 100.0,
            {"method": "crypto", "currency": t["currency"], "payment_id": payment_id},
        )
        await _maybe_pay_referral(t["user_id"])
        await _grant_wheel_spins_on_deposit(
            t["user_id"], t["amount_usd_cents"] / 100.0
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
    if usd_cents > cashier.MAX_WITHDRAW_USD_CENTS:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum withdrawal is {cashier.MAX_WITHDRAW_AUD} AUD per transaction",
        )
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not fresh.get("kyc_approved"):
        raise HTTPException(
            status_code=403,
            detail="Identity verification required before withdrawing. Please complete KYC in the Cashier.",
        )
    # Reserve funds atomically so concurrent withdrawal requests cannot overdraw.
    debit = await db.users.update_one(
        {"user_id": user["user_id"], "real_balance_cents": {"$gte": usd_cents}},
        {"$inc": {"real_balance_cents": -usd_cents}},
    )
    if not debit.modified_count:
        raise HTTPException(status_code=400, detail="Insufficient cash balance")
    ref = str(uuid.uuid4())
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
            "provider_ref": ref,
            "destination": payload.destination,
            "vault_ok": False,
            "vault_detail": "Queued for the withdrawal worker",
            "sandbox": cashier.is_placeholder_vault(),
            "created_at": now_iso,
            "updated_at": now_iso,
        }
    )
    await db.house_bankroll.update_one(
        {"_id": "house"},
        {
            "$inc": {"pending_payout_cents": usd_cents},
            "$set": {"updated_at": now_iso},
        },
        upsert=True,
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
        "vault_connected": False,
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
@api.get("/admin/bankroll")
async def admin_bankroll(admin: dict = Depends(require_admin)):
    bankroll = await get_house_bankroll_summary()
    return {
        "house_bankroll_usd": bankroll["bankroll_usd"],
        "available_usd": bankroll["available_usd"],
        "coverage_ratio": bankroll["coverage_ratio"],
        "cash_in_usd": round(bankroll["cash_in_cents"] / 100.0, 2),
        "cash_out_usd": round(bankroll["cash_out_cents"] / 100.0, 2),
        "pending_payout_usd": round(bankroll["pending_payout_cents"] / 100.0, 2),
    }


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
    bankroll = await get_house_bankroll_summary()
    return {
        "total_deposits_usd": round(deposits / 100.0, 2),
        "total_withdrawals_usd": round(withdrawals / 100.0, 2),
        "total_player_balances_usd": round((bal[0]["t"] if bal else 0) / 100.0, 2),
        "pending_withdrawals": pending_wd,
        "house_bankroll_usd": bankroll["bankroll_usd"],
        "house_payout_coverage_usd": bankroll["available_usd"],
        "house_coverage_ratio": bankroll["coverage_ratio"],
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
    if not t or t["status"] not in ("pending", "processing"):
        raise HTTPException(
            status_code=400, detail="No actionable withdrawal with that id"
        )
    if action == "reject" and t["status"] == "processing":
        raise HTTPException(
            status_code=409,
            detail="Withdrawal is already with the vault and cannot be rejected here",
        )
    now_iso = datetime.now(timezone.utc).isoformat()
    if action == "approve":
        await db.cashier_transactions.update_one(
            {"id": txn_id, "status": {"$in": ["pending", "processing"]}},
            {"$set": {"status": "completed", "updated_at": now_iso}},
        )
        await db.house_bankroll.update_one(
            {"_id": "house"},
            {"$inc": {"pending_payout_cents": -int(t["amount_usd_cents"])}, "$set": {"updated_at": now_iso}},
            upsert=True,
        )
        await record_house_cashflow(
            t["amount_usd_cents"] / 100.0,
            "player_payout",
            "cashier_withdrawal_approved",
            {"user_id": t["user_id"], "txn_id": txn_id, "by": admin["email"]},
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
    await db.house_bankroll.update_one(
        {"_id": "house"},
        {
            "$inc": {"pending_payout_cents": -int(t["amount_usd_cents"])},
            "$set": {"updated_at": now_iso},
        },
        upsert=True,
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
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_origin_regex=CORS_ALLOW_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _safe_create_index(collection, field_name, **kwargs):
    try:
        await collection.create_index(field_name, **kwargs)
    except OperationFailure as exc:
        if exc.code == 13 or "not authorized" in str(exc).lower() or "createindex" in str(exc).lower():
            logger.warning(
                "Skipping Mongo index creation for %s on %s because the DB user is not authorized: %s",
                getattr(collection, "name", type(collection).__name__),
                field_name,
                exc,
            )
            return
        raise
    except Exception as exc:
        logger.warning(
            "Skipping Mongo index creation for %s on %s due to non-fatal startup issue: %s",
            getattr(collection, "name", type(collection).__name__),
            field_name,
            exc,
            exc_info=True,
        )
        return


@app.on_event("startup")
async def startup():
    validate_runtime_config()
    global db
    db = _ensure_db()
    await _safe_create_index(db.users, "email", unique=True)
    await _safe_create_index(db.users, "user_id", unique=True)
    await _safe_create_index(db.user_sessions, "session_token")
    await _safe_create_index(db.payment_transactions, "session_id")
    await _safe_create_index(db.house_ledger, "created_at")
    await _safe_create_index(db.house_bankroll, "_id")
    await db.house_bankroll.update_one(
        {"_id": "house"},
        {
            "$setOnInsert": {
                "starting_bankroll_cents": 0,
                "bankroll_cents": 0,
                "cash_in_cents": 0,
                "cash_out_cents": 0,
                "pending_payout_cents": 0,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=True,
    )
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
    global client, db
    if client is not None:
        client.close()
        client = None
        db = None
