"""Durable, non-financial operations queue primitives.

This module deliberately contains no worker and no payment side effects.  It
only provides the MongoDB state transitions needed for an authenticated HQ
operator (or a future, separately-reviewed worker) to coordinate work.
"""

from datetime import datetime, timedelta, timezone
import re
import uuid

from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError


_JOB_TYPE_RE = re.compile(r"^[a-z][a-z0-9_.-]{1,63}$")


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _public(doc, *, include_lease=True):
    if not doc:
        return None
    result = dict(doc)
    result.pop("_id", None)
    if not include_lease:
        result.pop("lease_token", None)
    for key in ("created_at", "updated_at", "lease_until", "completed_at", "failed_at"):
        value = result.get(key)
        if isinstance(value, datetime):
            result[key] = value.isoformat()
    return result


def validate_job_type(job_type: str) -> str:
    value = (job_type or "").strip()
    if not _JOB_TYPE_RE.fullmatch(value):
        raise ValueError("job_type must be a lowercase operation identifier")
    return value


async def audit(db, *, action, actor, job_id=None, details=None):
    doc = {
        "audit_id": uuid.uuid4().hex,
        "action": action,
        "actor_user_id": actor.get("user_id"),
        "actor_email": actor.get("email"),
        "job_id": job_id,
        "details": details or {},
        "created_at": now_utc(),
    }
    await db.operations_audit.insert_one(doc)
    return _public(doc)


async def create_job(db, *, job_type, payload, actor, idempotency_key=None):
    job_type = validate_job_type(job_type)
    if not isinstance(payload, dict):
        raise ValueError("payload must be an object")
    if idempotency_key:
        existing = await db.operations_jobs.find_one(
            {"idempotency_key": idempotency_key}, {"_id": 0}
        )
        if existing:
            return _public(existing), False
    now = now_utc()
    doc = {
        "job_id": uuid.uuid4().hex,
        "job_type": job_type,
        "payload": payload,
        "status": "queued",
        "attempts": 0,
        "lease_token": None,
        "lease_until": None,
        "claimed_by": None,
        "created_by": actor.get("user_id"),
        "created_at": now,
        "updated_at": now,
    }
    if idempotency_key:
        doc["idempotency_key"] = idempotency_key
    try:
        await db.operations_jobs.insert_one(doc)
    except DuplicateKeyError:
        # A retry can race the unique idempotency index.  Return the durable
        # winner rather than creating a second unit of work.
        if idempotency_key:
            existing = await db.operations_jobs.find_one(
                {"idempotency_key": idempotency_key}, {"_id": 0}
            )
            if existing:
                return _public(existing), False
        raise
    await audit(db, action="job_created", actor=actor, job_id=doc["job_id"],
                details={"job_type": job_type})
    return _public(doc), True


async def claim_job(db, *, job_id, actor, lease_seconds=300):
    lease_seconds = max(30, min(int(lease_seconds), 3600))
    now = now_utc()
    token = uuid.uuid4().hex
    doc = await db.operations_jobs.find_one_and_update(
        {
            "job_id": job_id,
            "$or": [
                {"status": "queued"},
                {"status": "leased", "lease_until": {"$lte": now}},
            ],
        },
        {
            "$set": {
                "status": "leased",
                "lease_token": token,
                "lease_until": now + timedelta(seconds=lease_seconds),
                "claimed_by": actor.get("user_id"),
                "updated_at": now,
            },
            "$inc": {"attempts": 1},
        },
        projection={"_id": 0},
        return_document=ReturnDocument.AFTER,
    )
    if doc:
        await audit(db, action="job_claimed", actor=actor, job_id=job_id,
                    details={"lease_seconds": lease_seconds})
    return _public(doc)


async def finish_job(db, *, job_id, lease_token, actor, success, result=None, error=None):
    if not lease_token:
        return None
    now = now_utc()
    status = "completed" if success else "failed"
    update = {
        "$set": {
            "status": status,
            "result": result or {},
            "error": error,
            "updated_at": now,
            "completed_at" if success else "failed_at": now,
        },
        "$unset": {"lease_token": "", "lease_until": "", "claimed_by": ""},
    }
    doc = await db.operations_jobs.find_one_and_update(
        {"job_id": job_id, "status": "leased", "lease_token": lease_token},
        update,
        projection={"_id": 0},
        return_document=ReturnDocument.AFTER,
    )
    if doc:
        await audit(db, action=f"job_{status}", actor=actor, job_id=job_id,
                    details={"error": error} if error else {})
    return _public(doc)
