"""Validates and normalizes email addresses at every boundary that stores or compares one.
Suppression, attribution, and the sending allowlist all compare these normalized strings with exact equality.
"""

import re

# A practical address check (no quoted local parts or IP literals), used instead of adding the
# email-validator dependency. It rejects whitespace and control characters, so a stored address
# can never smuggle a second header line into a message.
_EMAIL_PATTERN = re.compile(
    r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+"
    r"@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?"
    r"(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$"
)
MAX_EMAIL_LENGTH = 254


def normalize_email(address: str) -> str:
    """Return the address trimmed and lowercased, the one form stored and compared everywhere."""

    return address.strip().lower()


def is_valid_email(address: str) -> bool:
    """Return True for a plausible single mailbox address such as bids@bayclean.example."""

    candidate = address.strip()
    return len(candidate) <= MAX_EMAIL_LENGTH and _EMAIL_PATTERN.fullmatch(candidate) is not None
