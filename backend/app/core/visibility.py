"""Owns listing visibility states and the private-by-default guard.
Any ambiguous or missing value is treated as non-public here.
"""

from enum import StrEnum


class ListingVisibility(StrEnum):
    """Enumerates the lifecycle states for one listing."""

    private = "private"
    scope_confirmed = "scope_confirmed"
    public = "public"
    closed = "closed"
    shortlisted = "shortlisted"
    # An offer was accepted: bidding is closed and the listing is no longer served publicly (roadmap 12, step 4).
    accepted = "accepted"


PRIVATE_DEFAULT = ListingVisibility.private


def is_public(value: ListingVisibility | None) -> bool:
    """Return True only for an explicit public visibility value."""

    try:
        return value == ListingVisibility.public
    except Exception:
        return False
