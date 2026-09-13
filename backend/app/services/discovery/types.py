"""The data shapes that cross the discovery source boundary: a query in, raw providers and a status out.
Nothing here is persisted; the discovery run turns these into candidate rows.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.services.discovery.evidence.records import CandidateEvidence

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
    # ProviderCandidateProvenance value: demo_data, public_web or public_award.
    provenance: str
    # The page title as returned, kept for the aggregator title heuristics.
    page_title: str | None = None
    # USAspending's recipient identifier. When present it is the provider's identity: deduplication and
    # rediscovery match on it alone and never merge two UEIs because their names look alike.
    supplier_uei: str | None = None
    # The awards and pages behind this provider, each attributable to its own source after merging.
    evidence: list[CandidateEvidence] = Field(default_factory=list)


class DiscoverySearchResult(BaseModel):
    """What one source search produced, with an explicit status so failure never reads as "no providers"."""

    status: DiscoveryStatus
    detail: str | None = None
    retrieved_at: datetime
    providers: list[DiscoveredProvider] = Field(default_factory=list)
