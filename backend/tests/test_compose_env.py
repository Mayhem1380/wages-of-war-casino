from pathlib import Path
import sys

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
