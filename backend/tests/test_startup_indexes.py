import asyncio

from pymongo.errors import OperationFailure

import server


class FakeCollection:
    async def create_index(self, *args, **kwargs):
        raise OperationFailure(
            "not authorized on night-vision-gold to execute createIndexes",
            code=13,
        )

    async def update_one(self, *args, **kwargs):
        return None

    async def find_one(self, *args, **kwargs):
        return None

    async def insert_one(self, *args, **kwargs):
        return None


class FakeDB:
    def __init__(self):
        self.users = FakeCollection()
        self.user_sessions = FakeCollection()
        self.payment_transactions = FakeCollection()
        self.house_ledger = FakeCollection()
        self.house_bankroll = FakeCollection()


def test_startup_ignores_create_index_permission_failure(monkeypatch):
    monkeypatch.setattr(server, "validate_runtime_config", lambda: None)
    monkeypatch.setattr(server, "_ensure_db", lambda: FakeDB())
    monkeypatch.delenv("ADMIN_EMAIL", raising=False)
    monkeypatch.delenv("ADMIN_PASSWORD", raising=False)

    asyncio.run(server.startup())
