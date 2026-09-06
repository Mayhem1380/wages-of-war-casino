import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import media_release


VALID = {
    "filename": "george-v1.mp4",
    "content_type": "video/mp4",
    "size_bytes": 1024,
    "sha256": "a" * 64,
    "version": "v1.0.0",
}


def test_metadata_is_normalized_without_file_access():
    result = media_release.validate_metadata(VALID)
    assert result["media_key"] == "george"
    assert result["sha256"] == "a" * 64


@pytest.mark.parametrize("field,value", [
    ("filename", "../george.mp4"),
    ("filename", "george.mov"),
    ("content_type", "application/octet-stream"),
    ("sha256", "not-a-checksum"),
    ("version", "release-candidate"),
])
def test_metadata_rejects_unsafe_or_unverifiable_values(field, value):
    data = dict(VALID)
    data[field] = value
    with pytest.raises(ValueError):
        media_release.validate_metadata(data)


def test_publish_checklist_requires_all_three_controls():
    with pytest.raises(ValueError):
        media_release.validate_checklist({"legal": True, "licensing": True})
    assert media_release.validate_checklist(
        {"legal": True, "licensing": True, "deployment": True}
    )["deployment"] is True


def test_public_projection_hides_id_and_serializes_release_dates():
    public = media_release.public({
        "_id": "internal",
        "release_id": "release-1",
        "created_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
    })
    assert "_id" not in public
    assert public["created_at"].startswith("2026-01-01T00:00:00")
