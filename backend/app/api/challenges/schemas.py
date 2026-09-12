"""Request and response schemas for marketplace challenge endpoints."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

# Supported billing frequencies for challenge submissions.
# Must stay in sync with MONTHLY_FACTORS in app/core/cadence.py.
BillingFrequency = Literal["weekly", "biweekly", "monthly", "quarterly", "annual", "yearly"]


class ChallengeInput(BaseModel):
    """Captures a challenger submission or revision payload."""

    price_minor: int
    price_currency: str = "USD"
    # Restricted to supported frequencies so normalize_to_monthly never raises.
    billing_frequency: BillingFrequency
    scope_included: list[str] = Field(default_factory=list)
    scope_excluded: list[str] = Field(default_factory=list)
    scope_extras: list[str] = Field(default_factory=list)
    setup_fee_minor: int = 0
    taxes_included: bool | None = None
    supplies_included: bool | None = None
    minimum_term: str | None = None
    other_conditions: str | None = None
    message_to_owner: str | None = None
    availability: str | None = None
    offer_expiry: datetime | None = None
    site_visit_required: bool = False
    provenance: str = "challenger_submitted"


class ChallengeResponse(BaseModel):
    """Represents one current challenge in owner or submit responses."""

    id: str
    listing_id: str
    scope_version_id: str
    challenger_account_id: str
    challenger_name: str | None = None
    bidding_mode_at_submission: str
    price_minor: int
    price_currency: str
    billing_frequency: str
    scope_included: list[str]
    scope_excluded: list[str]
    scope_extras: list[str]
    setup_fee_minor: int
    taxes_included: bool | None
    supplies_included: bool | None
    minimum_term: str | None
    other_conditions: str | None
    message_to_owner: str | None
    availability: str | None
    offer_expiry: datetime | None
    site_visit_required: bool
    provenance: str
    submitted_at: datetime
    revised_at: datetime | None
    is_active: bool


class ChallengeListResponse(BaseModel):
    """Wraps owner-visible challenge lists with an optional empty-state message."""

    challenges: list[ChallengeResponse]
    message: str | None = None


class LeaderboardEntry(BaseModel):
    """Represents an anonymized public leaderboard row for open bidding."""

    challenge_id: str
    normalized_price_minor: int
    price_currency: str
    scope_completeness: float
    submitted_at: datetime


class LeaderboardResponse(BaseModel):
    """Wraps leaderboard rows with the listing's active bidding mode."""

    bidding_mode: str
    entries: list[LeaderboardEntry]
