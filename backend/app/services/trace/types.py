"""Response models for the owner-only offer trace, one model per link in the chain.
The chain runs savings -> offer -> scope version -> listing -> current-price baseline -> expense -> transactions.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.services.flybrain import FlyBrainAttribution


class TraceSavings(BaseModel):
    """The headline potential-savings figure and the two monthly amounts it is computed from.

    The baseline is the price confirmed on the scope version the offer answered, not necessarily today's.
    """

    label: str
    currency: str
    baseline_monthly_minor: int
    offer_monthly_minor: int
    annual_recurring_savings_minor: int
    first_year_net_savings_minor: int
    is_provisional: bool
    assumptions: list[str]


class TraceOffer(BaseModel):
    """The counteroffer as submitted, with its provenance and revision history size."""

    challenge_id: str
    challenger_name: str
    provenance: str
    bidding_mode_at_submission: str
    price_minor: int
    price_currency: str
    billing_frequency: str
    normalized_monthly_minor: int
    setup_fee_minor: int
    scope_included: list[str]
    scope_excluded: list[str]
    scope_extras: list[str]
    scope_completeness: float
    missing_items: list[str]
    unstated_items: list[str]
    # Set when the offer can't be compared with its baseline (e.g. another currency); savings is then None.
    unranked_reason: str | None
    submitted_at: datetime
    revised_at: datetime | None
    revision_count: int


class TraceScopeVersion(BaseModel):
    """The scope version the offer answered, which may be older than the listing's current one."""

    id: str
    version_number: int
    created_at: datetime
    is_listing_current_version: bool
    service_area: str | None
    location_approximate: str | None
    square_footage: int | None
    visit_frequency: str | None
    bathroom_count: int | None
    required_tasks: list[str]
    supplies_included: bool | None
    equipment_included: bool | None
    taxes_included: bool | None
    current_price_minor: int | None
    current_price_currency: str
    billing_cadence: str | None
    challenge_deadline: datetime | None


class TraceListing(BaseModel):
    """The listing record as stored now, including whether it is still public."""

    id: str
    visibility: str
    bidding_mode: str
    category: str
    price_minor: int
    price_currency: str
    billing_cadence: str
    published_at: datetime | None
    current_scope_version_number: int


class TraceBaseline(BaseModel):
    """The price this offer's savings are measured against, and where that price came from.

    It is resolved from the scope version the offer answered, so a later re-scope doesn't move it.
    """

    source: Literal["owner_confirmed_scope", "transaction_baseline"]
    amount_minor: int
    currency: str
    cadence: str
    monthly_minor: int
    # Set when the owner confirmed the price on a scope version; None for the transaction fallback.
    confirmed_on_scope_version: int | None


class TraceExpense(BaseModel):
    """The private recurring-expense baseline, observed over its supporting transactions."""

    id: str
    vendor: str
    category: str | None
    cadence: str
    amount_minor_per_period: int
    annualized_amount_minor: int
    currency: str
    period_count: int
    recurrence_confidence: float
    first_seen: datetime
    last_seen: datetime
    provenance: list[str]


class TraceTransaction(BaseModel):
    """One original transaction filed under the expense's vendor, with its source label.

    Not every row supports the baseline: counts_toward_baseline says which ones it was computed from.
    """

    id: str
    posted_at: datetime
    raw_description: str
    # Unsigned, as imported; direction carries the sign, so a refund credit has the same amount as a charge.
    amount_minor: int
    currency: str
    direction: str
    status: str
    source_type: str
    is_excluded: bool
    excluded_reason: str | None
    # Computed by the baseline code itself, so the page never re-derives which rows count.
    counts_toward_baseline: bool


class OfferTrace(BaseModel):
    """The whole chain for one offer, visible only to the listing owner."""

    # None when the offer is unranked; there is no figure to trace, and offer.unranked_reason says why.
    savings: TraceSavings | None
    offer: TraceOffer
    scope_version: TraceScopeVersion
    listing: TraceListing
    baseline: TraceBaseline
    expense: TraceExpense
    transactions: list[TraceTransaction]
    # Labels the Compound Eye, which chose the counted rows; it is still listed, with its reason, when it didn't run.
    fly_brain: list[FlyBrainAttribution]
