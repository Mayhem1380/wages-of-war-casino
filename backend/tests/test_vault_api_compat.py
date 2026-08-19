import asyncio

import cashier


def test_vault_headers_include_live_api_key_variants(monkeypatch):
    monkeypatch.setattr(cashier, "VAULT_API_KEY", "live_vault_key_123")
    monkeypatch.setattr(cashier, "VAULT_PLATFORM", "wages_of_war")

    headers = cashier._vault_headers()

    assert headers["Authorization"] == "Bearer live_vault_key_123"
    assert headers["X-API-Key"] == "live_vault_key_123"
    assert headers["X-Platform"] == "wages_of_war"


def test_vault_submit_withdrawal_accepts_updated_response_fields(monkeypatch):
    class FakeResponse:
        status_code = 200

        def json(self):
            return {"status": "approved", "vault_id": "vault_abc123", "id": "legacy_id"}

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def post(self, *args, **kwargs):
            return FakeResponse()

    monkeypatch.setattr(cashier.httpx, "AsyncClient", FakeClient)
    monkeypatch.setattr(cashier, "VAULT_API_KEY", "live_vault_key_123")

    result = asyncio.run(
        cashier.vault_submit_withdrawal("USD", 25.0, "AU12345678901234", "ref-123")
    )

    assert result["ok"] is True
    assert result["vault_id"] == "vault_abc123"
    assert result["status"] == "approved"
