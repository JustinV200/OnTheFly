"""Upserts filtered providers into a listing's durable candidate list.
A manually added candidate is never overwritten; a rediscovered one gets its retrieval time and sources refreshed.
"""

from datetime import datetime
import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.email_address import normalize_email
from app.core.provenance import ProviderCandidateOrigin
from app.models.listing import PublicListingRecord
from app.models.outreach.provider_candidate import ProviderCandidate
from app.services.discovery.filters.identity import build_dedupe_key, identity_of
from app.services.discovery.types import DiscoveredProvider


def upsert_discovered_candidates(
    listing: PublicListingRecord,
    providers: list[DiscoveredProvider],
    source_name: str,
    retrieved_at: datetime,
    db: Session,
) -> int:
    """Stage new candidates and refresh matching discovered ones; return how many new rows were added.

    Assumes providers are already aggregator-filtered and deduplicated. Matching against stored
    candidates uses the same deterministic identity rules as deduplication, so a provider added
    by hand and later discovered stays one row. The caller commits.
    """

    existing = list(db.scalars(select(ProviderCandidate).where(ProviderCandidate.listing_id == listing.id)).all())
    new_count = 0
    for provider in providers:
        identity = identity_of(provider.business_name, provider.website_url, provider.phone)
        match = next(
            (
                candidate
                for candidate in existing
                if identity_of(candidate.business_name, candidate.website_url, candidate.phone).matches(identity)
            ),
            None,
        )
        if match is None:
            candidate = _new_candidate(listing, provider, source_name, retrieved_at)
            db.add(candidate)
            existing.append(candidate)
            new_count += 1
        elif match.origin == ProviderCandidateOrigin.discovered.value:
            _refresh(match, provider, retrieved_at)
        # A manually added match is left exactly as the owner entered it.
    return new_count


def _new_candidate(
    listing: PublicListingRecord,
    provider: DiscoveredProvider,
    source_name: str,
    retrieved_at: datetime,
) -> ProviderCandidate:
    return ProviderCandidate(
        listing_id=listing.id,
        owner_account_id=listing.owner_account_id,
        business_name=provider.business_name,
        website_url=provider.website_url,
        contact_email=normalize_email(provider.contact_email) if provider.contact_email else None,
        contact_email_source_url=provider.contact_email_source_url if provider.contact_email else None,
        phone=provider.phone,
        service_area=provider.service_area,
        capability_summary=provider.capability_summary,
        origin=ProviderCandidateOrigin.discovered.value,
        discovery_source=source_name,
        provenance=provider.provenance,
        source_urls=json.dumps(provider.source_urls),
        retrieved_at=retrieved_at,
        dedupe_key=build_dedupe_key(provider.business_name, provider.website_url),
    )


def _refresh(candidate: ProviderCandidate, provider: DiscoveredProvider, retrieved_at: datetime) -> None:
    # Details only fill gaps: a value already shown to the owner (and perhaps already invited) is not
    # swapped underneath them. Every source URL is kept, so each stored detail stays citable.
    candidate.retrieved_at = retrieved_at
    candidate.source_urls = json.dumps(list(dict.fromkeys([*json.loads(candidate.source_urls), *provider.source_urls])))
    if candidate.contact_email is None and provider.contact_email:
        candidate.contact_email = normalize_email(provider.contact_email)
        candidate.contact_email_source_url = provider.contact_email_source_url
    candidate.website_url = candidate.website_url or provider.website_url
    candidate.phone = candidate.phone or provider.phone
    candidate.service_area = candidate.service_area or provider.service_area
    candidate.capability_summary = candidate.capability_summary or provider.capability_summary
