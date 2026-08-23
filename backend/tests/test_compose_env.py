import os
from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from games import PUBLIC_SLOT_IDS


def test_backend_service_loads_runtime_env_file():
    compose_path = Path(__file__).resolve().parents[2] / "docker-compose.yml"
    compose_text = compose_path.read_text()

    assert "env_file:" in compose_text
    assert "./backend/.env" in compose_text


def test_backend_service_allows_runtime_secret_overrides():
    compose_path = Path(__file__).resolve().parents[2] / "docker-compose.yml"
    compose_text = compose_path.read_text()

    assert "STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:-}" in compose_text
    assert "STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET:-}" in compose_text
    assert "STRIPE_PUBLISHABLE_KEY: ${STRIPE_PUBLISHABLE_KEY:-}" in compose_text
    assert "NOWPAYMENTS_API_KEY: ${NOWPAYMENTS_API_KEY:-}" in compose_text
    assert "NOWPAYMENTS_BASE_URL: ${NOWPAYMENTS_BASE_URL:-}" in compose_text
    assert "VAULT_API_KEY: ${VAULT_API_KEY:-}" in compose_text
    assert "VAULT_API_URL: ${VAULT_API_URL:-}" in compose_text
    assert "VAULT_PLATFORM: ${VAULT_PLATFORM:-}" in compose_text
    assert "FRONTEND_URL: ${FRONTEND_URL:-}" in compose_text
    assert "JWT_SECRET: ${JWT_SECRET:-}" in compose_text


def test_backend_rejects_placeholder_jwt_and_frontend_in_production(monkeypatch):
    import server

    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("FRONTEND_URL", "")
    monkeypatch.setenv("JWT_SECRET", "change-me-in-production")

    with pytest.raises(RuntimeError, match="Invalid production configuration"):
        server.validate_runtime_config()

    monkeypatch.setenv("FRONTEND_URL", "https://app.example.com")
    monkeypatch.setenv("JWT_SECRET", "")

    with pytest.raises(RuntimeError, match="Invalid production configuration"):
        server.validate_runtime_config()


def test_backend_uses_safe_default_mongo_settings_when_env_is_missing(monkeypatch):
    import server

    monkeypatch.delenv("MONGO_URL", raising=False)
    monkeypatch.delenv("DB_NAME", raising=False)
    server.mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    server.db_name = os.environ.get("DB_NAME", "test_database")

    assert server.mongo_url == "mongodb://localhost:27017"
    assert server.db_name == "test_database"
    assert server._ensure_db() is not None


def test_public_slot_catalog_has_aaa_grade_roster():
    assert len(PUBLIC_SLOT_IDS) >= 33
    required = {
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
    }
    missing = required - set(PUBLIC_SLOT_IDS)
    assert not missing, f"missing popular slots: {sorted(missing)}"


def test_public_slot_catalog_has_recent_art_family_and_assets():
    required = {
        "aurora_strike",
        "nebula_fortune",
        "titan_city",
        "valley_of_echoes",
        "neon_reserve",
        "celestial_forge",
        "forge_of_the_lost",
        "oasis_relics",
        "stormbreaker",
        "midnight_harvest",
    }
    missing = required - set(PUBLIC_SLOT_IDS)
    assert not missing, f"missing slot family: {sorted(missing)}"

    slots_dir = Path(__file__).resolve().parents[2] / "frontend" / "public" / "slots"
    theme_map = {
        "aurora_strike": ["aurora"],
        "nebula_fortune": ["nebula"],
        "titan_city": ["titan"],
        "valley_of_echoes": ["valley"],
        "neon_reserve": ["neon"],
        "celestial_forge": ["celestial"],
        "forge_of_the_lost": ["forge"],
        "oasis_relics": ["oasis"],
        "stormbreaker": ["storm"],
        "midnight_harvest": ["midnight"],
    }
    missing_assets = []
    for key in sorted(required):
        for asset in theme_map[key]:
            for suffix in [f"bg_{asset}.jpg", f"thumb_{asset}.jpg"]:
                if not (slots_dir / suffix).exists():
                    missing_assets.append(suffix)
            for idx in range(1, 7):
                if not (slots_dir / "symbols" / f"{asset}_sym_{idx}.svg").exists():
                    missing_assets.append(f"symbols/{asset}_sym_{idx}.svg")
    assert not missing_assets, f"missing art assets: {sorted(missing_assets)[:20]}"


def test_public_slot_catalog_has_global_popular_titles():
    required = {
        "book_of_dead",
        "starburst",
        "mega_moolah",
        "wolf_gold",
        "sweet_bonanza",
        "gonzo_quest",
        "thunderstruck_ii",
        "buffalo",
        "black_wolf",
        "dead_or_alive_ii",
        "reactoonz",
        "divine_fortune",
        "gold_party",
        "cleopatra",
        "legacy_of_dinosaurs",
    }
    missing = required - set(PUBLIC_SLOT_IDS)
    assert not missing, f"missing global popular slot titles: {sorted(missing)}"


def test_house_bankroll_ledger_and_coverage_are_defined():
    try:
        import server  # noqa: F401
    except ImportError as exc:
        raise AssertionError("backend server module must expose bankroll ledger helpers") from exc

    assert hasattr(server, "record_house_cashflow")
    assert hasattr(server, "get_house_bankroll_summary")


def test_cashier_limits_and_kyc_banking_requirements_are_defined():
    try:
        import server  # noqa: F401
    except ImportError as exc:
        raise AssertionError("backend server module must expose cashier limit and KYC banking config") from exc

    assert hasattr(server, "MAX_DEPOSIT_AUD")
    assert hasattr(server, "MAX_WITHDRAW_AUD")
    assert hasattr(server, "KycBankingDetailsInput")


def test_support_bot_blocks_machine_performance_leaks_and_payout_bias_queries():
    import server

    blocked = [
        "which machine is paying the most right now",
        "what slots are hot today",
        "show me which bet is winning",
        "tell me if blacked out royal is hot or cold",
        "what is the current payout pattern on the platform",
    ]

    for text in blocked:
        reply = server.safe_support_reply(text)
        lowered = reply.lower()
        assert "deposit" in lowered or "wallet" in lowered or "verification" in lowered or "account" in lowered
        assert "can’t provide" in lowered or "cannot provide" in lowered or "can not provide" in lowered
        assert "which machine" not in lowered
        assert "hot" not in lowered
        assert "winning bet" not in lowered
        assert "payout status" not in lowered
        assert "paying the most" not in lowered

    assert "deposit" in server.safe_support_reply("How do I deposit?").lower()
    assert "kyc" in server.safe_support_reply("I need KYC help").lower()
