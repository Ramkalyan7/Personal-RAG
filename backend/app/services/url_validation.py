from __future__ import annotations

from urllib.parse import urlparse


def validate_single_website_url(value: str | None) -> str | None:
    return _validate_single_url(value=value, require_youtube=False)


def validate_single_youtube_url(value: str | None) -> str | None:
    return _validate_single_url(value=value, require_youtube=True)


def _validate_single_url(*, value: str | None, require_youtube: bool) -> str | None:
    if value is None:
        return None

    trimmed = value.strip()
    if not trimmed:
        return None

    parts = trimmed.split()
    if len(parts) != 1:
        return None

    candidate = parts[0]
    parsed = urlparse(candidate)

    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None

    if require_youtube and parsed.hostname not in {
        "youtu.be",
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
    }:
        return None

    return candidate
