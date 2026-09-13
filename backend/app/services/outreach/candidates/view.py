"""The owner-facing shape of a provider candidate, with provenance and eligibility side by side.
Owner-only: candidates are never part of any public payload.
"""

import json
from datetime import datetime

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.timestamps import as_utc
from app.models.listing import PublicListingRecord
from app.models.outreach.provider_candidate import ProviderCandidate
from app.services.outreach.candidates.eligibility import (
    AssessedCandidate,
    CandidateEligibility,
    assess_candidates,
)
from app.services.outreach.senders.base import OutreachSender


class CandidateView(BaseModel):
    """One candidate as the owner's review list shows it."""

    id: str
    listing_id: str
    business_name: str
    website_url: str | None
    contact_email: str | None
    contact_email_source_url: str | None
    phone: str | None
    service_area: str | None
    capability_summary: str | None
    origin: str
    discovery_source: str
    provenance: str
    supplier_uei: str | None
    source_urls: list[str]
    evidence: list[dict[str, object]]
    retrieved_at: datetime | None
    contacted_off_platform: bool
    created_at: datetime
    eligibility: CandidateEligibility
    invitation_id: str | None


def list_candidate_views(
    listing: PublicListingRecord, sender: OutreachSender, db: Session
) -> list[CandidateView]:
    """Return every candidate for the listing, oldest first, each with its current eligibility.

    Assumes the caller already checked the acting account owns the listing.
    """

    candidates = list(
        db.scalars(
            select(ProviderCandidate)
            .where(ProviderCandidate.listing_id == listing.id)
            .order_by(ProviderCandidate.created_at, ProviderCandidate.id)
        ).all()
    )
    assessed = assess_candidates(listing, candidates, sender, db)
    return [
        candidate_view(candidate, assessed[candidate.id]) for candidate in candidates
    ]


def view_candidate(
    candidate: ProviderCandidate, sender: OutreachSender, db: Session
) -> CandidateView:
    """Return one candidate with its current eligibility, e.g. right after the owner adds it."""

    listing = db.get(PublicListingRecord, candidate.listing_id)
    if listing is None:
        # The foreign key makes this unreachable; failing loudly beats serializing an unassessed candidate.
        raise LookupError(
            f"Listing {candidate.listing_id} for candidate {candidate.id} does not exist"
        )
    return candidate_view(
        candidate, assess_candidates(listing, [candidate], sender, db)[candidate.id]
    )


def candidate_view(
    candidate: ProviderCandidate, assessed: AssessedCandidate
) -> CandidateView:
    """Serialize one candidate with its assessed eligibility."""

    return CandidateView(
        id=candidate.id,
        listing_id=candidate.listing_id,
        business_name=candidate.business_name,
        website_url=candidate.website_url,
        contact_email=candidate.contact_email,
        contact_email_source_url=candidate.contact_email_source_url,
        phone=candidate.phone,
        service_area=candidate.service_area,
        capability_summary=candidate.capability_summary,
        origin=candidate.origin,
        discovery_source=candidate.discovery_source,
        provenance=candidate.provenance,
        supplier_uei=candidate.supplier_uei,
        source_urls=json.loads(candidate.source_urls),
        evidence=json.loads(candidate.evidence),
        retrieved_at=as_utc(candidate.retrieved_at) if candidate.retrieved_at else None,
        contacted_off_platform=candidate.contacted_off_platform,
        created_at=as_utc(candidate.created_at),
        eligibility=assessed.eligibility,
        invitation_id=assessed.invitation_id,
    )
