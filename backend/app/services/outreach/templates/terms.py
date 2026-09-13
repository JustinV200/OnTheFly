"""Formats a listing's public job terms (price per cadence, bidding mode, deadline) as invitation sentences.
Formatting is deterministic code over the stored integer amounts; nothing is estimated or rounded for effect.
"""

from datetime import datetime

from app.core.timestamps import as_utc
from app.services.listings.bidding_mode import BiddingMode, resolve_bidding_mode

_CADENCE_PHRASES: dict[str, str] = {
    "weekly": "per week",
    "biweekly": "every two weeks",
    "monthly": "per month",
    "bimonthly": "every two months",
    "quarterly": "per quarter",
    "annual": "per year",
    "yearly": "per year",
}


def describe_price(price_minor: int, currency: str, billing_cadence: str) -> str:
    """Return e.g. "$2,400.00 per month"; a non-USD amount is shown with its code, never converted."""

    sign = "-" if price_minor < 0 else ""
    units, cents = divmod(abs(price_minor), 100)
    amount = f"{units:,}.{cents:02d}"
    code = currency.strip().upper()
    money = f"{sign}${amount}" if code == "USD" else f"{sign}{amount} {code}"
    cadence = billing_cadence.strip().casefold()
    return f"{money} {_CADENCE_PHRASES.get(cadence, f'({cadence})')}"


def describe_bidding_mode(bidding_mode: str) -> str:
    """Return the bidding-mode sentence; anything but an explicit "open" reads as sealed, as the listing does."""

    if resolve_bidding_mode(bidding_mode) == BiddingMode.open:
        return "Open bidding: prices are visible to the business and other bidders, identities never are."
    return "Offers are sealed: other bidders can't see your price."


def describe_deadline(challenge_deadline: datetime | None) -> str:
    """Return the deadline sentence in UTC, or say plainly that no deadline is set."""

    if challenge_deadline is None:
        return "The listing has no offer deadline set."
    deadline = as_utc(challenge_deadline)
    return f"Offers close {deadline.strftime('%B')} {deadline.day}, {deadline.year} at {deadline.strftime('%H:%M')} UTC."
