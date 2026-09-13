"""Declares everything a Ways to save card is computed from, stored whole on the card.
Recomputing a card from these inputs must reproduce its integer results exactly (roadmap 12, step 9).
"""

from datetime import date, datetime

from pydantic import BaseModel

from app.services.market_data import AwardRecord, SupplierCount


class CardRequirement(BaseModel):
    """One requirement in the segment, with its hours and whether the owner confirmed them."""

    key: str
    text: str
    hours: int | None
    hours_status: str


class RateBasis(BaseModel):
    """The owner's own rate for the segment's labor category, or its absence."""

    labor_category: str
    kind: str
    rate_minor_per_hour: int | None
    provenance: str | None
    effective_date: date | None


class CutBasis(BaseModel):
    """The public (or demo) rate sample the suggested cut is priced at."""

    source: str
    provenance: str
    status: str
    retrieved_at: datetime
    matched_labor_categories: list[str]
    p25_minor: int | None
    median_minor: int | None
    p75_minor: int | None
    sample_size: int
    limitations: str


class SupplierBasis(BaseModel):
    """The award evidence behind the supplier count."""

    source: str
    provenance: str
    status: str
    retrieved_at: datetime
    psc: str
    naics: str
    place_of_performance: str | None
    lookback_years: int
    count: SupplierCount
    awards: list[AwardRecord]
    limitations: str


class CardInputs(BaseModel):
    """The full input set of one card."""

    segment_key: str
    labor_category: str
    psc: str
    naics: str
    requirements: list[CardRequirement]
    rate: RateBasis
    cut_basis: CutBasis
    suppliers: SupplierBasis
    # The owner's remainder when the card was computed; a suggested cut must fit it.
    remainder_minor: int | None
    # Constraint kinds that flow into a piece (clearance, location, set-aside); eligibility is not checkable yet.
    constraint_kinds: list[str]
