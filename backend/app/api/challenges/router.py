"""Implements challenge submission, revision, owner review, and public leaderboard endpoints."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.challenges.schemas import (
    ChallengeInput,
    ChallengeListResponse,
    ChallengeResponse,
    LeaderboardEntry,
    LeaderboardResponse,
)
from app.core.identity import require_acting_account_id
from app.core.visibility import ListingVisibility
from app.db.session import get_db
from app.models.account import Account
from app.models.challenge import Challenge
from app.models.listing import PublicListingRecord, ScopeVersion
from app.services.comparison.normalize import is_scope_complete, normalize_to_monthly
from app.services.challenges.submit import revise_challenge, submit_challenge
from app.services.listings.bidding_mode import BiddingMode, resolve_bidding_mode

router = APIRouter(tags=["challenges"])


@router.post("/api/listings/{listing_id}/challenges", response_model=ChallengeResponse)
def create_challenge(
    listing_id: str,
    payload: ChallengeInput,
    request: Request,
    db: Session = Depends(get_db),
) -> ChallengeResponse:
    """Submit a challenge for the acting account against a public listing."""

    acting_account_id = require_acting_account_id(request)
    challenge = submit_challenge(listing_id, acting_account_id, payload.model_dump(), db)
    return _serialize_challenge(challenge, db)


@router.patch("/api/challenges/{challenge_id}", response_model=ChallengeResponse)
def update_challenge(
    challenge_id: str,
    payload: ChallengeInput,
    request: Request,
    db: Session = Depends(get_db),
) -> ChallengeResponse:
    """Revise the acting account's active challenge and retain a snapshot."""

    acting_account_id = require_acting_account_id(request)
    challenge = revise_challenge(challenge_id, acting_account_id, payload.model_dump(), db)
    return _serialize_challenge(challenge, db)


@router.get("/api/listings/{listing_id}/challenges", response_model=ChallengeListResponse)
def list_owner_challenges(
    listing_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> ChallengeListResponse:
    """Return full challenge details with identities to the listing owner only."""

    acting_account_id = require_acting_account_id(request)
    listing = db.scalar(
        select(PublicListingRecord).where(
            PublicListingRecord.id == listing_id,
            PublicListingRecord.owner_account_id == acting_account_id,
        )
    )
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    challenges = db.scalars(
        select(Challenge)
        .where(Challenge.listing_id == listing_id)
        .where(Challenge.is_active.is_(True))
        .order_by(Challenge.submitted_at.asc())
    ).all()
    if not challenges:
        return ChallengeListResponse(challenges=[], message="No challenges received yet")
    return ChallengeListResponse(challenges=[_serialize_challenge(challenge, db) for challenge in challenges])


@router.get("/api/listings/{listing_id}/leaderboard", response_model=LeaderboardResponse)
def get_leaderboard(listing_id: str, db: Session = Depends(get_db)) -> LeaderboardResponse:
    """Return anonymized leaderboard rows for challenges submitted while bidding was open."""

    # Filter on visibility in the query, not just existence: an unpublished listing
    # keeps its record and its challenges, and its offer prices must go dark with it.
    listing = db.scalar(
        select(PublicListingRecord).where(
            PublicListingRecord.id == listing_id,
            PublicListingRecord.visibility == ListingVisibility.public.value,
        )
    )
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    challenges = db.scalars(
        select(Challenge)
        .where(Challenge.listing_id == listing_id)
        .where(Challenge.is_active.is_(True))
    ).all()
    # Publicity is read from the mode stored on each offer, never the listing's current mode.
    sealed_offer_count = sum(
        1 for challenge in challenges if challenge.bidding_mode_at_submission != BiddingMode.open.value
    )
    if resolve_bidding_mode(listing.bidding_mode) != BiddingMode.open:
        return LeaderboardResponse(
            bidding_mode=listing.bidding_mode,
            entries=[],
            total_offer_count=len(challenges),
            sealed_offer_count=sealed_offer_count,
        )

    scope = db.get(ScopeVersion, listing.scope_version_id)
    if scope is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scope version not found")
    entries = []
    for challenge in challenges:
        if challenge.bidding_mode_at_submission != BiddingMode.open.value:
            continue
        # Compute normalization once per challenge to avoid redundant calculation.
        normalized = normalize_to_monthly(challenge)
        entries.append(
            LeaderboardEntry(
                challenge_id=challenge.id,
                normalized_price_minor=normalized.monthly_price.amount,
                price_currency=normalized.monthly_price.currency,
                scope_completeness=is_scope_complete(challenge, scope).score,
                submitted_at=challenge.submitted_at,
                provenance=challenge.provenance,
            )
        )
    entries.sort(key=lambda entry: (-entry.scope_completeness, entry.normalized_price_minor, entry.submitted_at))
    return LeaderboardResponse(
        bidding_mode=listing.bidding_mode,
        entries=entries,
        total_offer_count=len(challenges),
        sealed_offer_count=sealed_offer_count,
    )



def _serialize_challenge(challenge: Challenge, db: Session) -> ChallengeResponse:
    challenger = db.get(Account, challenge.challenger_account_id)
    return ChallengeResponse(
        id=challenge.id,
        listing_id=challenge.listing_id,
        scope_version_id=challenge.scope_version_id,
        challenger_account_id=challenge.challenger_account_id,
        challenger_name=challenger.business_name if challenger else None,
        bidding_mode_at_submission=challenge.bidding_mode_at_submission,
        price_minor=challenge.price_minor,
        price_currency=challenge.price_currency,
        billing_frequency=challenge.billing_frequency,
        scope_included=json.loads(challenge.scope_included),
        scope_excluded=json.loads(challenge.scope_excluded),
        scope_extras=json.loads(challenge.scope_extras),
        setup_fee_minor=challenge.setup_fee_minor,
        taxes_included=challenge.taxes_included,
        supplies_included=challenge.supplies_included,
        minimum_term=challenge.minimum_term,
        other_conditions=challenge.other_conditions,
        message_to_owner=challenge.message_to_owner,
        availability=challenge.availability,
        offer_expiry=challenge.offer_expiry,
        site_visit_required=challenge.site_visit_required,
        provenance=challenge.provenance,
        submitted_at=challenge.submitted_at,
        revised_at=challenge.revised_at,
        is_active=challenge.is_active,
    )
