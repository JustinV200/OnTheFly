"""Implements owner-only inbox and side-by-side comparison endpoints.
These endpoints sort by scope completeness before normalized price.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.inbox.schemas import (
    ComparisonResponse,
    ComparisonRowResponse,
    InboxChallengeResponse,
    InboxResponse,
    SavingsResponse,
)
from app.core.identity import require_acting_account_id
from app.db.session import get_db
from app.models.account import Account
from app.models.challenge import Challenge
from app.models.listing import PublicListingRecord, ScopeVersion
from app.models.service_expense import ServiceExpense
from app.services.comparison.rank import rank_challenges
from app.services.evidence.check import CheckResult
from app.services.evidence.refresh import get_or_refresh_challenger_evidence

router = APIRouter(tags=["inbox"])


@router.get("/api/listings/{listing_id}/inbox", response_model=InboxResponse)
def get_inbox(
    listing_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> InboxResponse:
    """Return ranked owner-visible challenges for one owned listing."""

    acting_account_id = require_acting_account_id(request)
    listing, scope, expense = _get_owner_listing_context(listing_id, acting_account_id, db)
    challenges = db.scalars(
        select(Challenge)
        .where(Challenge.listing_id == listing.id)
        .where(Challenge.is_active.is_(True))
    ).all()
    ranked_rows = rank_challenges(challenges, scope, expense)[1:]
    responses = []
    challenge_lookup = {challenge.id: challenge for challenge in challenges}
    for row in ranked_rows:
        challenger = db.get(Account, row.challenger_account_id)
        challenge = challenge_lookup.get(row.challenge_id or "")
        if challenger is None or row.savings is None or row.challenge_id is None or challenge is None:
            continue
        evidence = get_or_refresh_challenger_evidence(challenge, db)
        platform_check = CheckResult.model_validate_json(evidence.platform_check)
        identity_check = CheckResult.model_validate_json(evidence.identity_check)
        registry_check = CheckResult.model_validate_json(evidence.registry_check)
        responses.append(
            InboxChallengeResponse(
                challenge_id=row.challenge_id,
                challenger_name=challenger.business_name,
                normalized_price_minor=row.normalized_price.amount,
                price_currency=row.normalized_price.currency,
                scope_completeness=row.scope_completeness,
                missing_items=row.missing_items,
                added_items=row.added_items,
                unstated_items=row.unstated_items,
                savings=_serialize_savings(row.savings),
                evidence_status="not_checked",
                platform_check_status=platform_check.status,
                identity_check_status=identity_check.status,
                registry_check_status=registry_check.status,
                provenance=row.provenance,
                bidding_mode_at_submission=row.bidding_mode_at_submission or "sealed",
            )
        )
    return InboxResponse(challenges=responses)


@router.get("/api/listings/{listing_id}/comparison", response_model=ComparisonResponse)
def get_comparison(
    listing_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> ComparisonResponse:
    """Return the incumbent baseline row plus ranked challenges for one listing."""

    acting_account_id = require_acting_account_id(request)
    listing, scope, expense = _get_owner_listing_context(listing_id, acting_account_id, db)
    challenges = db.scalars(
        select(Challenge)
        .where(Challenge.listing_id == listing.id)
        .where(Challenge.is_active.is_(True))
    ).all()
    rows = []
    for row in rank_challenges(challenges, scope, expense):
        challenger_name = "Incumbent baseline"
        if row.challenger_account_id:
            challenger = db.get(Account, row.challenger_account_id)
            challenger_name = challenger.business_name if challenger else "Unknown challenger"
        rows.append(
            ComparisonRowResponse(
                challenge_id=row.challenge_id,
                challenger_name=challenger_name,
                is_incumbent=row.is_incumbent,
                normalized_price_minor=row.normalized_price.amount,
                price_currency=row.normalized_price.currency,
                scope_completeness=row.scope_completeness,
                missing_items=row.missing_items,
                added_items=row.added_items,
                unstated_items=row.unstated_items,
                savings=_serialize_savings(row.savings) if row.savings else None,
                provenance=row.provenance,
            )
        )
    return ComparisonResponse(rows=rows)


def _get_owner_listing_context(
    listing_id: str,
    acting_account_id: str,
    db: Session,
) -> tuple[PublicListingRecord, ScopeVersion, ServiceExpense]:
    listing = db.scalar(
        select(PublicListingRecord).where(
            PublicListingRecord.id == listing_id,
            PublicListingRecord.owner_account_id == acting_account_id,
        )
    )
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    scope = db.get(ScopeVersion, listing.scope_version_id)
    expense = db.get(ServiceExpense, listing.expense_id)
    if scope is None or expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing context not found")
    return listing, scope, expense


def _serialize_savings(savings) -> SavingsResponse:
    return SavingsResponse(
        annual_recurring_savings_minor=savings.annual_recurring_savings.amount,
        first_year_net_savings_minor=savings.first_year_net_savings.amount,
        is_provisional=savings.is_provisional,
        assumptions=savings.assumptions,
        label=savings.label,
    )
