"""Adds a provider the owner found by hand to a listing's candidate list (roadmap 08, step 4).
It stores exactly what the owner entered, labeled owner_entered, and never invites anyone.
"""

import json

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.email_address import normalize_email
from app.core.provenance import ProviderCandidateOrigin, ProviderCandidateProvenance
from app.models.outreach.provider_candidate import ProviderCandidate
from app.services.discovery import build_dedupe_key, identity_of
from app.services.listings.owned_listing import get_owned_listing

# Stored as the discovery source of a manual addition, beside "fixture" and "tavily".
OWNER_SOURCE_NAME = "owner"


class ManualCandidateInput(BaseModel):
    """The owner's entry, already validated at the API boundary."""

    business_name: str
    contact_email: str | None = None
    website_url: str | None = None
    phone: str | None = None
    service_area: str | None = None
    capability_summary: str | None = None
    contacted_off_platform: bool = False


def add_manual_candidate(
    listing_id: str,
    acting_account_id: str,
    entry: ManualCandidateInput,
    db: Session,
) -> ProviderCandidate:
    """Store a manually added candidate; raise 404 for another owner's listing and 409 for a duplicate.

    Duplicates use the same deterministic identity rules as discovery (domain, phone, name), so a
    provider can't appear twice whether it was typed in or found by a search.
    """

    listing = get_owned_listing(listing_id, acting_account_id, db)
    existing = db.scalars(select(ProviderCandidate).where(ProviderCandidate.listing_id == listing.id)).all()
    identity = identity_of(entry.business_name, entry.website_url, entry.phone)
    duplicate = next(
        (
            candidate
            for candidate in existing
            if identity_of(candidate.business_name, candidate.website_url, candidate.phone).matches(identity)
        ),
        None,
    )
    if duplicate is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This provider is already in the list as {duplicate.business_name}",
        )

    candidate = ProviderCandidate(
        listing_id=listing.id,
        owner_account_id=acting_account_id,
        business_name=entry.business_name,
        website_url=entry.website_url,
        contact_email=normalize_email(entry.contact_email) if entry.contact_email else None,
        # The owner typed it in; there is no published page to cite.
        contact_email_source_url=None,
        phone=entry.phone,
        service_area=entry.service_area,
        capability_summary=entry.capability_summary,
        origin=ProviderCandidateOrigin.manually_added.value,
        discovery_source=OWNER_SOURCE_NAME,
        provenance=ProviderCandidateProvenance.owner_entered.value,
        source_urls=json.dumps([]),
        retrieved_at=None,
        dedupe_key=build_dedupe_key(entry.business_name, entry.website_url),
        contacted_off_platform=entry.contacted_off_platform,
    )
    db.add(candidate)
    try:
        db.commit()
    except IntegrityError as error:
        # A concurrent add of the same provider reached the unique (listing, dedupe_key) constraint first.
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This provider is already in the list") from error
    db.refresh(candidate)
    return candidate
