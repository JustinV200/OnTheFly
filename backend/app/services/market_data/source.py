"""The market-data interface shared by Ways to save and (later) REBID discovery (roadmap 12, step 8).
External calls live only in implementations of this interface; everything that counts or computes is plain code.
"""

from datetime import date, datetime
from typing import Literal, Protocol

from pydantic import BaseModel

EvidenceStatus = Literal["ok", "no_match", "unavailable"]
EvidenceProvenance = Literal["demo_data", "public_api"]


class SupplierQuery(BaseModel):
    """What a segment asks the award sources: its classification, where the work is, and how far back."""

    psc: str | None
    naics: str | None
    place_of_performance: str | None
    lookback_years: int


class AwardRecord(BaseModel):
    """One prime award or reported subaward, kept with its identifiers. Amounts are integer minor units."""

    award_id: str
    award_type: Literal["prime", "subaward"]
    recipient_name: str
    # None when the source has no UEI: the record is listed but never counted as a supplier.
    uei: str | None
    amount_minor: int
    currency: str
    action_date: date | None
    url: str | None


class SupplierRetrieval(BaseModel):
    """One award retrieval and its limits."""

    source: str
    provenance: EvidenceProvenance
    status: EvidenceStatus
    query: SupplierQuery
    retrieved_at: datetime
    records: list[AwardRecord]
    limitations: str


class LaborRateQuery(BaseModel):
    """What a segment asks the labor-rate source."""

    labor_category: str
    place_of_performance: str | None


class LaborRateRetrieval(BaseModel):
    """One labor-rate retrieval: the matched sample in integer minor units per hour, and the mapping used."""

    source: str
    provenance: EvidenceProvenance
    status: EvidenceStatus
    query: LaborRateQuery
    retrieved_at: datetime
    # The source's own labor category names matched to the segment's category; saved, never re-derived.
    matched_labor_categories: list[str]
    rates_minor_per_hour: list[int]
    limitations: str


class MarketDataSource(Protocol):
    """A provider of award and labor-rate evidence."""

    name: str

    def find_suppliers(self, query: SupplierQuery) -> SupplierRetrieval:
        """Return awards matching the query; status says whether the source answered."""

    def find_labor_rates(self, query: LaborRateQuery) -> LaborRateRetrieval:
        """Return the matching hourly rates; status says whether the source answered."""
