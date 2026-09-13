"""Parses the comma-separated SMTP recipient allowlist into normalized exact addresses."""

from app.core.email_address import normalize_email


def parse_recipient_allowlist(raw: str) -> frozenset[str]:
    """Return the normalized addresses listed; blank entries are ignored, and an empty setting allows nobody."""

    return frozenset(normalize_email(entry) for entry in raw.split(",") if entry.strip())
