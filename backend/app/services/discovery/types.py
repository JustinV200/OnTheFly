"""The data shapes that cross the discovery source boundary: a query in, raw providers and a status out.
Nothing here is persisted; the discovery run turns these into candidate rows.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

# ok: the source ran (possibly finding nothing). unavailable: it could not run (e.g. no API key).
# error: it tried and failed. Only ok means the source was actually checked.
DiscoveryStatus = Literal["ok", "unavailable", "error"]


class DiscoveryQuery(BaseModel):
    """One search phrasing, with the structured public fields it was built from."""

    text: str
    category: str
    service_area: str


class DiscoveredProvider(BaseModel):
    """One raw provider as a source returned it, before aggregator filtering and deduplication."""

    business_name: str
    website_url: str | None = None
    # Only an address the source actually published; never guessed from a domain.
    contact_email: str | None = None
    contact_email_source_url: str | None = None
    phone: str | None = None
    service_area: str | None = None
    capability_summary: str | None = None
    source_urls: list[str] = Field(default_factory=list)
    # ProviderCandidateProvenance value: demo_data or public_web.
    provenance: str
    # The page title as returned, kept for the aggregator title heuristics.
    page_title: str | None = None
    # USAspending's recipient identifier.  It is deliberately separate from the
    # display name: names are only a fallback for the existing candidate deduper.
    supplier_uei: str | None = None
    # Source-specific facts retained verbatim for owner review.  Each entry has a
    # source, URL, and source payload; this keeps award and web evidence distinct.
    evidence: list[dict[str, object]] = Field(default_factory=list)


class DiscoverySearchResult(BaseModel):
    """What one source search produced, with an explicit status so failure never reads as "no providers"."""

    status: DiscoveryStatus
    detail: str | None = None
    retrieved_at: datetime
    providers: list[DiscoveredProvider] = Field(default_factory=list)
