"""Controlled metadata-only release workflow for approved George video media.

This module intentionally has no filesystem or upload implementation.  The
actual MP4 is placed and verified by the deployment owner outside the API;
the API records the immutable metadata and controls publication state.
"""

import hashlib
import re
from datetime import datetime, timezone


MEDIA_KEY = "george"
MAX_MP4_BYTES = 2 * 1024 * 1024 * 1024
_FILENAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,199}\.mp4$", re.IGNORECASE)
_SHA256 = re.compile(r"^[0-9a-f]{64}$", re.IGNORECASE)
_VERSION = re.compile(r"^(?:v)?[0-9]+(?:\.[0-9]+){0,2}$", re.IGNORECASE)
CHECKLIST_KEYS = ("legal", "licensing", "deployment")


def now_utc():
    return datetime.now(timezone.utc)


def validate_metadata(data):
    """Validate release metadata and return a normalized copy.

    No path, URL, file content, or upload field is accepted here.  In
    particular, ``filename`` is a basename only and ``checksum`` is SHA-256.
    """
    if not isinstance(data, dict):
        raise ValueError("metadata must be an object")
    filename = str(data.get("filename") or "")
    if not _FILENAME.fullmatch(filename) or filename != filename.split("/")[-1]:
        raise ValueError("filename must be a safe .mp4 basename")
    content_type = str(data.get("content_type") or "").lower()
    if content_type != "video/mp4":
        raise ValueError("content_type must be video/mp4")
    try:
        size_bytes = int(data.get("size_bytes"))
    except (TypeError, ValueError):
        raise ValueError("size_bytes must be an integer")
    if size_bytes <= 0 or size_bytes > MAX_MP4_BYTES:
        raise ValueError("size_bytes is outside the permitted MP4 limit")
    checksum = str(data.get("sha256") or "").lower()
    if not _SHA256.fullmatch(checksum):
        raise ValueError("sha256 must be a 64-character hexadecimal checksum")
    version = str(data.get("version") or "")
    if not _VERSION.fullmatch(version):
        raise ValueError("version must be a numeric release version")
    return {
        "media_key": MEDIA_KEY,
        "filename": filename,
        "content_type": content_type,
        "size_bytes": size_bytes,
        "sha256": checksum,
        "version": version,
    }


def validate_checklist(checklist):
    if not isinstance(checklist, dict):
        raise ValueError("checklist must be an object")
    missing = [key for key in CHECKLIST_KEYS if checklist.get(key) is not True]
    if missing:
        raise ValueError("checklist confirmation required: " + ", ".join(missing))
    return {key: True for key in CHECKLIST_KEYS}


def checksum_for_bytes(content):
    """Small utility for offline deployment verification, not an upload API."""
    return hashlib.sha256(content).hexdigest()


def public(doc):
    if not doc:
        return None
    result = dict(doc)
    result.pop("_id", None)
    for key in ("created_at", "updated_at", "published_at", "rolled_back_at"):
        if isinstance(result.get(key), datetime):
            result[key] = result[key].isoformat()
    return result
