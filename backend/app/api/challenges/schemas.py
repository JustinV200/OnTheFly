"""Request and response schemas for marketplace challenge endpoints."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

# Supported billing frequencies for challenge submissions.
# Must stay in sync with MONTHLY_FACTORS in app/core/cadence.py.
BillingFrequency = Literal["weekly", "biweekly", "monthly", "bimonthly", "quarterly", "annual", "yearly"]


class ChallengeInput(BaseModel):
    """Captures a challenger submission or revision payload.

    There is deliberately no provenance field: the server decides it (services/challenges/provenance.py),
    so a web form can never label its own offer genuine. An extra "provenance" key is ignored.
    """

    # The mode the challenger was shown. Required so no client can submit without having
    # displayed the terms; a mismatch with the listing's current mode is rejected with 409.
    acknowledged_bidding_mode: Literal["sealed", "open"]
    # Bounded because ranking sorts on price and savings subtract it: a zero or negative amount
    # would top the leaderboard and fabricate potential savings. services/challenges/amounts.py
    # applies the same rule to callers that skip this schema.
    price_minor: int = Field(gt=0)
    # Optional with no default: the offer is always stored in the listing's currency. A value that
    # differs from it (ignoring case) is rejected with 400 by services/challenges/currency.py, since
    # an offer in another currency can't be compared with the listing's current price.
    price_currency: str | None = None
    # Restricted to supported frequencies so normalize_to_monthly never raises.
    billing_frequency: BillingFrequency
    scope_included: list[str] = Field(default_factory=list)
    scope_excluded: list[str] = Field(default_factory=list)
    scope_extras: list[str] = Field(default_factory=list)
    # Zero means no setup fee; a negative fee would add to first-year savings.
    setup_fee_minor: int = Field(default=0, ge=0)
    taxes_included: bool | None = None
    supplies_included: bool | None = None
    minimum_term: str | None = None
    other_conditions: str | None = None
    message_to_owner: str | None = None
    availability: str | None = None
    offer_expiry: datetime | None = None
    site_visit_required: bool = False


class ChallengeResponse(BaseModel):
    """Represents one current challenge in owner or submit responses."""

    id: str
    listing_id: str
    scope_version_id: str
    challenger_account_id: str
    challenger_name: str | None = None
    # The mode the current version was made under: set at submission and re-recorded at each revision.
    # Earlier versions keep their own mode in the private revision history.
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


class OwnOffer(BaseModel):
    """The acting business's own active offer on one listing, as its author sees it to revise it.

    Built field by field in api/challenges/own_offer.py rather than reusing ChallengeResponse, so it names
    no challenger (its only reader is the challenger) and a column later added to offers isn't returned here
    by accident.
    """

    id: str
    listing_id: str
    # The mode the current version was recorded under; unset or unknown reads as sealed. A revision is
    # recorded under the listing's mode when it is made, which the challenge page shows beside this one.
    bidding_mode_at_submission: Literal["sealed", "open"]
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
    # False once the owner re-scopes the listing: this version answered an earlier scope, and a revision
    # attaches to the current one. Scope is versioned so an edit never reframes an existing offer.
    answers_current_scope: bool


class OwnOfferResponse(BaseModel):
    """Wraps the acting business's own offer on a listing; offer is None when it has none there."""

    offer: OwnOffer | None
    message: str | None = None


class LeaderboardEntry(BaseModel):
    """Represents an anonymized public leaderboard row for open bidding."""

    challenge_id: str
    normalized_price_minor: int
    price_currency: str
    scope_completeness: float
    submitted_at: datetime
    # Origin label (challenger_submitted | captured_off_platform | demo_data). It names no one,
    # and without it a simulated price on a public leaderboard would read as a real market rate.
    provenance: str


class LeaderboardResponse(BaseModel):
    """Wraps leaderboard rows with the listing's active bidding mode and offer counts."""

    bidding_mode: str
    entries: list[LeaderboardEntry]
    # Every active offer counts, including ones submitted while bidding was sealed. Those stay
    # sealed (no row, no price), so sealed_offer_count explains why entries can be shorter.
    total_offer_count: int
    sealed_offer_count: int
