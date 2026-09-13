"""Implements challenge submission, revision, owner review, and public leaderboard endpoints."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.challenges.own_offer import router as own_offer_router
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
from app.services.comparison.answered_scopes import load_answered_scopes
from app.services.comparison.currency import currency_mismatch_reason
from app.services.comparison.normalize import is_scope_complete, normalize_to_monthly
from app.services.comparison.ordering import offer_sort_key
from app.services.challenges.submit import revise_challenge, submit_challenge
from app.services.listings.bidding_mode import BiddingMode, resolve_bidding_mode

router = APIRouter(tags=["challenges"])
# A challenger's own-offer route lives in its own module; including it here keeps api/router.py's wiring unchanged.
router.include_router(own_offer_router)


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
    """Return anonymized leaderboard rows for challenges submitted while bidding was open.

    Rows follow offer_sort_key: offers on the current scope version, then offers on earlier versions,
    then offers in another currency, which are listed but never ranked.
    """

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
    current_scope = db.get(ScopeVersion, listing.scope_version_id)
    if current_scope is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scope version not found")
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
            current_scope_version_number=current_scope.version_number,
        )

    open_challenges = [
        challenge for challenge in challenges if challenge.bidding_mode_at_submission == BiddingMode.open.value
    ]
    answered_scopes = load_answered_scopes(open_challenges, db)
    entries = [
        _leaderboard_entry(challenge, answered_scopes[challenge.scope_version_id], current_scope, listing.price_currency)
        for challenge in open_challenges
    ]
    entries.sort(
        key=lambda entry: (
            *offer_sort_key(
                is_ranked=entry.unranked_reason is None,
                is_current_scope_version=entry.is_current_scope_version,
                answered_scope_version_number=entry.answered_scope_version_number,
                scope_completeness=entry.scope_completeness,
                normalized_price_minor=entry.normalized_price_minor,
            ),
            entry.submitted_at,
        )
    )
    return LeaderboardResponse(
        bidding_mode=listing.bidding_mode,
        entries=entries,
        total_offer_count=len(challenges),
        sealed_offer_count=sealed_offer_count,
        current_scope_version_number=current_scope.version_number,
    )


def _leaderboard_entry(
    challenge: Challenge,
    answered_scope: ScopeVersion,
    current_scope: ScopeVersion,
    listing_currency: str,
) -> LeaderboardEntry:
    # Completeness is scored against the version this offer answered: a later scope edit must not
    # lower a public score for work that was never requested of it.
    normalized = normalize_to_monthly(challenge)
    return LeaderboardEntry(
        challenge_id=challenge.id,
        normalized_price_minor=normalized.monthly_price.amount,
        price_currency=normalized.monthly_price.currency,
        scope_completeness=is_scope_complete(challenge, answered_scope).score,
        answered_scope_version_number=answered_scope.version_number,
        is_current_scope_version=answered_scope.id == current_scope.id,
        # Measured against the published price's currency, which every viewer sees, so ranked prices on
        # this board are always in one currency and an off-currency offer sits apart, unranked.
        unranked_reason=currency_mismatch_reason(normalized.monthly_price.currency, listing_currency),
        submitted_at=challenge.submitted_at,
        provenance=challenge.provenance,
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
