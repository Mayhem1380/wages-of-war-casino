import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import operations


def test_job_type_is_a_safe_operation_identifier():
    assert operations.validate_job_type("kyc_review.v1") == "kyc_review.v1"
    with pytest.raises(ValueError):
        operations.validate_job_type("send money")
    with pytest.raises(ValueError):
        operations.validate_job_type("KYC_REVIEW")


def test_public_projection_removes_mongo_id_and_serializes_dates():
    row = {
        "_id": "internal",
        "job_id": "job-1",
        "created_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
        "payload": {"case_id": "case-1"},
    }
    public = operations._public(row)
    assert "_id" not in public
    assert public["created_at"].startswith("2026-01-01T00:00:00")
    assert public["payload"]["case_id"] == "case-1"
