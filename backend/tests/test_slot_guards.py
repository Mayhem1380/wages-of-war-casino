import pytest
from fastapi import HTTPException

from server import get_public_slot_machine


def test_public_slot_guard_rejects_unknown_machine():
    with pytest.raises(HTTPException) as exc:
        get_public_slot_machine("not-a-public-machine")

    assert exc.value.status_code == 404


def test_public_slot_guard_returns_catalogue_machine():
    machine = get_public_slot_machine("book_of_dead")

    assert machine["id"] == "book_of_dead"
