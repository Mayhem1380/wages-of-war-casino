"""Wages of War Casino - Real-money cashier framework (SANDBOX / test keys).

Handles fiat (Stripe) + crypto (NOWPayments) deposits and withdrawals routed
through the approval vault. All money is held internally in USD cents.

NOTE: This is the structural framework wired with TEST / PLACEHOLDER keys.
Swap the env vars for live keys to go live. Real fund movement stays in
sandbox until live credentials + a licensed gambling PSP are connected.
"""

import os
import hashlib
import hmac
import json
import uuid
import logging
from typing import Any, Optional

import httpx

logger = logging.getLogger("wagesofwar.cashier")

# ---------------------------------------------------------------------------
# Supported currencies (base = USD). Rates are indicative sandbox rates.
# ---------------------------------------------------------------------------
CURRENCIES = {
    # code:  name, type, symbol, decimals, usd_price, color
    "USD": {
        "name": "US Dollar",
        "type": "FIAT",
        "symbol": "$",
        "decimals": 2,
        "usd_price": 1.0,
        "color": "#3B82F6",
    },
    "EUR": {
        "name": "Euro",
        "type": "FIAT",
        "symbol": "€",
        "decimals": 2,
        "usd_price": 1.08,
        "color": "#6366F1",
    },
    "GBP": {
        "name": "British Pound",
        "type": "FIAT",
        "symbol": "£",
        "decimals": 2,
        "usd_price": 1.27,
        "color": "#8B5CF6",
    },
    "AUD": {
        "name": "Australian Dollar",
        "type": "FIAT",
        "symbol": "A$",
        "decimals": 2,
        "usd_price": 0.66,
        "color": "#10B981",
    },
    "BTC": {
        "name": "Bitcoin",
        "type": "CRYPTO",
        "symbol": "₿",
        "decimals": 8,
        "usd_price": 67000.0,
        "color": "#F7931A",
    },
    "ETH": {
        "name": "Ethereum",
        "type": "CRYPTO",
        "symbol": "Ξ",
        "decimals": 8,
        "usd_price": 3500.0,
        "color": "#627EEA",
    },
    "USDT": {
        "name": "Tether",
        "type": "CRYPTO",
        "symbol": "₮",
        "decimals": 6,
        "usd_price": 1.0,
        "color": "#26A17B",
    },
    "SOL": {
        "name": "Solana",
        "type": "CRYPTO",
        "symbol": "◎",
        "decimals": 6,
        "usd_price": 150.0,
        "color": "#14F195",
    },
    "XRP": {
        "name": "XRP",
        "type": "CRYPTO",
        "symbol": "✕",
        "decimals": 6,
        "usd_price": 0.60,
        "color": "#23292F",
    },
}

FIAT_CODES = [c for c, m in CURRENCIES.items() if m["type"] == "FIAT"]
CRYPTO_CODES = [c for c, m in CURRENCIES.items() if m["type"] == "CRYPTO"]

# Limits are defined in AUD per spec, converted to USD cents internally.
MIN_DEPOSIT_AUD = 10.0
MAX_DEPOSIT_AUD = 5000.0
MIN_WITHDRAW_AUD = 20.0
MAX_WITHDRAW_AUD = 25000.0


def _aud_to_usd_cents(aud: float) -> int:
    return round(aud * CURRENCIES["AUD"]["usd_price"] * 100)


MIN_DEPOSIT_USD_CENTS = _aud_to_usd_cents(MIN_DEPOSIT_AUD)
MAX_DEPOSIT_USD_CENTS = _aud_to_usd_cents(MAX_DEPOSIT_AUD)
MIN_WITHDRAW_USD_CENTS = _aud_to_usd_cents(MIN_WITHDRAW_AUD)
MAX_WITHDRAW_USD_CENTS = _aud_to_usd_cents(MAX_WITHDRAW_AUD)


def currency_list():
    out = []
    for code, m in CURRENCIES.items():
        out.append(
            {
                "code": code,
                **{
                    k: m[k]
                    for k in (
                        "name",
                        "type",
                        "symbol",
                        "decimals",
                        "usd_price",
                        "color",
                    )
                },
            }
        )
    return out


def to_usd_cents(amount: float, code: str) -> int:
    """Convert an amount in `code`'s major units to USD cents."""
    m = CURRENCIES[code]
    return round(amount * m["usd_price"] * 100)


def to_minor_unit(amount: float, code: str) -> int:
    """Convert a major-unit amount to the currency's smallest unit (e.g. cents/satoshi)."""
    m = CURRENCIES[code]
    return round(amount * (10 ** m["decimals"]))


def usd_cents_to_currency(usd_cents: int, code: str) -> float:
    """How much of `code` equals the given USD cents (major units)."""
    m = CURRENCIES[code]
    return round((usd_cents / 100.0) / m["usd_price"], m["decimals"])


def fmt_usd(usd_cents: int) -> str:
    return f"${usd_cents / 100.0:,.2f}"


# ---------------------------------------------------------------------------
# NOWPayments crypto client (sandbox / placeholder-key safe)
# ---------------------------------------------------------------------------
NOWPAYMENTS_API_KEY = os.environ.get("NOWPAYMENTS_API_KEY", "")
NOWPAYMENTS_IPN_SECRET = os.environ.get("NOWPAYMENTS_IPN_SECRET", "")
NOWPAYMENTS_BASE_URL = os.environ.get(
    "NOWPAYMENTS_BASE_URL", "https://api-sandbox.nowpayments.io/v1"
)

_MOCK_ADDR = {
    "BTC": "bc1qsandbox0wagesofwar0deposit0address0demo",
    "ETH": "0xSANDBOXwagesofwarETHdeposit000000000000",
    "USDT": "0xSANDBOXwagesofwarUSDTdeposit00000000000",
    "SOL": "So1anaSANDBOXwagesofwardeposit00000000000",
    "XRP": "rSANDBOXwagesofwarXRPdeposit0000000000000",
}


def _is_placeholder_np() -> bool:
    return (not NOWPAYMENTS_API_KEY) or "placeholder" in NOWPAYMENTS_API_KEY.lower()


# Map our display codes to NOWPayments network-specific tickers.
NP_CURRENCY_MAP = {
    "BTC": "btc",
    "ETH": "eth",
    "USDT": "usdttrc20",
    "SOL": "sol",
    "XRP": "xrp",
}


class CryptoProviderError(RuntimeError):
    pass


async def np_create_payment(
    amount_usd: float, pay_currency: str, order_id: str, ipn_url: str
) -> dict:
    """Create a NOWPayments crypto deposit.

    - Placeholder key -> returns a clearly-marked SANDBOX mock (safe, no real funds).
    - Live key -> calls the real API. On ANY failure it RAISES CryptoProviderError
      (never a fake address) so a player can never be shown a dead deposit address.
    """
    code = pay_currency.upper()
    pay_amount = usd_cents_to_currency(round(amount_usd * 100), code)

    if _is_placeholder_np():
        return {
            "payment_id": f"sandbox_{uuid.uuid4().hex[:16]}",
            "pay_address": _MOCK_ADDR.get(code, f"SANDBOX-{code}-ADDRESS"),
            "pay_amount": pay_amount,
            "pay_currency": code,
            "status": "waiting",
            "sandbox": True,
        }

    np_code = NP_CURRENCY_MAP.get(code, code.lower())
    headers = {"x-api-key": NOWPAYMENTS_API_KEY, "Content-Type": "application/json"}
    body = {
        "price_amount": float(amount_usd),
        "price_currency": "usd",
        "pay_currency": np_code,
        "order_id": order_id,
        "order_description": "Wages of War Casino deposit",
        "ipn_callback_url": ipn_url,
    }
    try:
        async with httpx.AsyncClient(timeout=25) as c:
            r = await c.post(
                NOWPAYMENTS_BASE_URL + "/payment", headers=headers, json=body
            )
    except Exception as e:
        logger.warning("NOWPayments unreachable: %s", e)
        raise CryptoProviderError(
            "Crypto provider is temporarily unavailable. Please try again shortly."
        )
    if r.status_code >= 400:
        try:
            msg = r.json().get("message") or r.text[:160]
        except Exception:
            msg = r.text[:160]
        logger.warning("NOWPayments create failed %s: %s", r.status_code, msg)
        if r.status_code == 429:
            raise CryptoProviderError(
                "Crypto provider is busy. Please try again in a moment."
            )
        raise CryptoProviderError(str(msg))
    p = r.json()
    return {
        "payment_id": str(p["payment_id"]),
        "pay_address": p.get("pay_address"),
        "pay_amount": p.get("pay_amount", pay_amount),
        "pay_currency": code,
        "status": p.get("payment_status", "waiting"),
        "sandbox": False,
    }


def np_verify_ipn(payload: dict, signature: Optional[str]) -> bool:
    """Verify NOWPayments IPN HMAC-SHA512 signature over sorted JSON."""
    if not signature or not NOWPAYMENTS_IPN_SECRET:
        return False

    def deep_sort(v: Any):
        if isinstance(v, dict):
            return {k: deep_sort(v[k]) for k in sorted(v)}
        if isinstance(v, list):
            return [deep_sort(x) for x in v]
        return v

    canonical = json.dumps(
        deep_sort(payload), separators=(",", ":"), ensure_ascii=False
    )
    expected = hmac.new(
        NOWPAYMENTS_IPN_SECRET.encode(), canonical.encode(), hashlib.sha512
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


# ---------------------------------------------------------------------------
# Approval Vault client (wages-vault.emergent.host)
# ---------------------------------------------------------------------------
VAULT_API_URL = os.environ.get("VAULT_API_URL", "https://wages-vault.emergent.host/api")
VAULT_API_KEY = os.environ.get("VAULT_API_KEY", "")
VAULT_PLATFORM = os.environ.get("VAULT_PLATFORM", "wages_of_war")


def _vault_headers() -> dict:
    headers = {
        "X-Platform": VAULT_PLATFORM,
        "Content-Type": "application/json",
    }
    if VAULT_API_KEY:
        headers["Authorization"] = f"Bearer {VAULT_API_KEY}"
        headers["X-API-Key"] = VAULT_API_KEY
    return headers


async def vault_crypto_address(currency_code: str) -> Optional[str]:
    """Ask the vault for a deposit address (used for crypto payout verification)."""
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(
                f"{VAULT_API_URL}/vault/crypto/address",
                headers=_vault_headers(),
                json={
                    "platform": VAULT_PLATFORM,
                    "currency_code": currency_code.upper(),
                },
            )
        if r.status_code < 400:
            return r.json().get("address")
    except Exception as e:
        logger.warning("vault address error: %s", e)
    return None


async def vault_submit_withdrawal(
    currency_code: str, amount: float, destination: str, reference: str
) -> dict:
    """Submit a withdrawal to the approval vault. Returns {ok, vault_id, status, detail}.

    With a placeholder VAULT_API_KEY the vault rejects auth; we then keep the
    withdrawal in a local 'pending' state so the in-app approval vault (admin)
    governs release. When a live VAULT_API_KEY is set the same call routes the
    request to the external vault for approval."""
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(
                f"{VAULT_API_URL}/vault/withdraw",
                headers=_vault_headers(),
                json={
                    "platform": VAULT_PLATFORM,
                    "currency_code": currency_code.upper(),
                    "amount": amount,
                    "destination": destination,
                    "reference": reference,
                },
            )
        if r.status_code < 400:
            data = r.json() if hasattr(r, "json") else {}
            vault_id = (
                data.get("vault_id")
                or data.get("id")
                or data.get("withdrawal_id")
                or data.get("reference")
                or ""
            )
            status = data.get("status") or data.get("state") or "pending"
            return {
                "ok": True,
                "vault_id": str(vault_id),
                "status": status,
                "detail": "",
            }
        return {
            "ok": False,
            "vault_id": "",
            "status": "pending",
            "detail": f"vault {r.status_code}: {r.text[:120]}",
        }
    except Exception as e:
        return {"ok": False, "vault_id": "", "status": "pending", "detail": str(e)}


def is_placeholder_vault() -> bool:
    return (
        (not VAULT_API_KEY)
        or "placeholder" in VAULT_API_KEY.lower()
        or "test" in VAULT_API_KEY.lower()
    )
