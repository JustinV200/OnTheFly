"""Implements owner-only inbox and side-by-side comparison endpoints.
These endpoints sort by scope completeness before normalized price, each offer against the scope version it answered.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.inbox.schemas import (
    ComparisonResponse,
    ComparisonRowResponse,
    EvidenceCheckSummary,
    InboxChallengeResponse,
    InboxResponse,
    InboxTaskSummary,
    SavingsResponse,
)
from app.core.identity import require_acting_account_id
from app.db.session import get_db
from app.models.account import Account
from app.models.challenge import Challenge
from app.models.listing import PublicListingRecord, ScopeVersion
from app.models.service_expense import ServiceExpense
from app.models.tasks import Task
from app.services.comparison.answered_scopes import load_answered_scopes
from app.services.comparison.fly_opinion_stimulus import fly_opinion_stimulus
from app.services.comparison.rank import RankedChallenge, rank_challenges
from app.services.comparison.requirement_completeness import load_requirement_context
from app.services.tasks.comparison_label import savings_label_for
from app.services.evidence.check import CheckResult
from app.services.evidence.refresh import get_or_refresh_challenger_evidence
from app.services.evidence.status import rollup_evidence
from app.services.listings.projection import projection_from_record

router = APIRouter(tags=["inbox"])


@router.get("/api/listings/{listing_id}/inbox", response_model=InboxResponse)
def get_inbox(
    listing_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> InboxResponse:
    """Return ranked owner-visible challenges for one owned listing."""

    acting_account_id = require_acting_account_id(request)
    listing, current_scope, expense, task = _get_owner_listing_context(listing_id, acting_account_id, db)
    challenges = db.scalars(
        select(Challenge)
        .where(Challenge.listing_id == listing.id)
        .where(Challenge.is_active.is_(True))
    ).all()
    ranked_rows = _rank(list(challenges), current_scope, expense, task, db)[1:]
    responses = []
    challenge_lookup = {challenge.id: challenge for challenge in challenges}
    for row in ranked_rows:
        challenger = db.get(Account, row.challenger_account_id)
        challenge = challenge_lookup.get(row.challenge_id or "")
        # An unranked offer (no savings) stays in the list: hiding it would make the rest look like every offer.
        if challenger is None or row.challenge_id is None or challenge is None:
            continue
        evidence = get_or_refresh_challenger_evidence(challenge, db)
        platform_check = CheckResult.model_validate_json(evidence.platform_check)
        identity_check = CheckResult.model_validate_json(evidence.identity_check)
        registry_check = CheckResult.model_validate_json(evidence.registry_check)
        responses.append(
            InboxChallengeResponse(
                challenge_id=row.challenge_id,
                challenger_name=challenger.business_name,
                # Offer rows always carry a normalized price; only the baseline row of a budgetless task lacks one.
                normalized_price_minor=row.normalized_price.amount if row.normalized_price else 0,
                price_currency=row.normalized_price.currency if row.normalized_price else listing.price_currency,
                scope_completeness=row.scope_completeness,
                missing_items=row.missing_items,
                added_items=row.added_items,
                unstated_items=row.unstated_items,
                answered_scope_version_number=row.answered_scope_version_number,
                is_current_scope_version=row.is_current_scope_version,
                baseline_monthly_minor=row.baseline_monthly.amount if row.baseline_monthly else None,
                baseline_currency=row.baseline_monthly.currency if row.baseline_monthly else listing.price_currency,
                savings=_serialize_savings(row.savings) if row.savings else None,
                unranked_reason=row.unranked_reason,
                evidence_rollup=rollup_evidence([platform_check, identity_check, registry_check]),
                platform_check_status=platform_check.status,
                identity_check_status=identity_check.status,
                registry_check_status=registry_check.status,
                evidence_checks=[
                    _summarize_check(check) for check in (platform_check, identity_check, registry_check)
                ],
                evidence_last_updated=evidence.last_updated,
                provenance=row.provenance,
                bidding_mode_at_submission=row.bidding_mode_at_submission or "sealed",
                submitted_at=challenge.submitted_at,
                revised_at=challenge.revised_at,
                # Owner-only like the rest of this row; it carries hashed receptor indices, never figures or names.
                fly_opinion_stimulus=fly_opinion_stimulus(row),
            )
        )
    return InboxResponse(
        challenges=responses,
        bidding_mode=listing.bidding_mode or "sealed",
        current_scope_version_number=current_scope.version_number,
        listing=projection_from_record(listing),
        task=_task_summary(task, acting_account_id),
    )


@router.get("/api/listings/{listing_id}/comparison", response_model=ComparisonResponse)
def get_comparison(
    listing_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> ComparisonResponse:
    """Return the incumbent baseline row plus ranked challenges for one listing."""

    acting_account_id = require_acting_account_id(request)
    listing, current_scope, expense, task = _get_owner_listing_context(listing_id, acting_account_id, db)
    challenges = db.scalars(
        select(Challenge)
        .where(Challenge.listing_id == listing.id)
        .where(Challenge.is_active.is_(True))
    ).all()
    rows = []
    for row in _rank(list(challenges), current_scope, expense, task, db):
        challenger_name = "Incumbent baseline"
        if row.challenger_account_id:
            challenger = db.get(Account, row.challenger_account_id)
            challenger_name = challenger.business_name if challenger else "Unknown challenger"
        rows.append(
            ComparisonRowResponse(
                challenge_id=row.challenge_id,
                challenger_name=challenger_name,
                is_incumbent=row.is_incumbent,
                normalized_price_minor=row.normalized_price.amount if row.normalized_price else None,
                price_currency=row.normalized_price.currency if row.normalized_price else listing.price_currency,
                scope_completeness=row.scope_completeness,
                missing_items=row.missing_items,
                added_items=row.added_items,
                unstated_items=row.unstated_items,
                answered_scope_version_number=row.answered_scope_version_number,
                is_current_scope_version=row.is_current_scope_version,
                baseline_monthly_minor=row.baseline_monthly.amount if row.baseline_monthly else None,
                baseline_currency=row.baseline_monthly.currency if row.baseline_monthly else listing.price_currency,
                savings=_serialize_savings(row.savings) if row.savings else None,
                unranked_reason=row.unranked_reason,
                provenance=row.provenance,
            )
        )
    return ComparisonResponse(rows=rows, current_scope_version_number=current_scope.version_number)


def _get_owner_listing_context(
    listing_id: str,
    acting_account_id: str,
    db: Session,
) -> tuple[PublicListingRecord, ScopeVersion, ServiceExpense | None, Task | None]:
    # "Owner" here is the listing's POSTER: it reviews offers and accepts one, even after task ownership moved.
    listing = db.scalar(
        select(PublicListingRecord).where(
            PublicListingRecord.id == listing_id,
            PublicListingRecord.owner_account_id == acting_account_id,
        )
    )
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    scope = db.get(ScopeVersion, listing.scope_version_id)
    # A new task or a piece has no expense; its baseline is its own stated budget or cut.
    expense = db.get(ServiceExpense, listing.expense_id) if listing.expense_id else None
    task = db.get(Task, listing.task_id) if listing.task_id else None
    if scope is None or (listing.expense_id is not None and expense is None):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing context not found")
    return listing, scope, expense, task


def _rank(
    challenges: list[Challenge],
    current_scope: ScopeVersion,
    expense: ServiceExpense | None,
    task: Task | None,
    db: Session,
) -> list[RankedChallenge]:
    answered_scopes = load_answered_scopes(challenges, db)
    return rank_challenges(
        challenges,
        current_scope,
        expense,
        answered_scopes,
        requirement_context=load_requirement_context(challenges, answered_scopes, db),
        savings_label=savings_label_for(task),
    )


def _task_summary(task: Task | None, acting_account_id: str) -> InboxTaskSummary | None:
    if task is None:
        return None
    return InboxTaskSummary(
        id=task.id,
        origin=task.origin,
        state=task.state,
        accepted_challenge_id=task.accepted_challenge_id,
        is_owned_by_you=task.owner_account_id == acting_account_id,
    )


def _summarize_check(check: CheckResult) -> EvidenceCheckSummary:
    # The check's result payload is left out on purpose: the inbox shows status with its source,
    # and anything record-level stays behind the dedicated evidence endpoint.
    return EvidenceCheckSummary(
        source=check.source,
        status=check.status,
        match_confidence=check.match_confidence,
        checked_at=check.checked_at,
        limitations=check.limitations,
    )


def _serialize_savings(savings) -> SavingsResponse:
    return SavingsResponse(
        annual_recurring_savings_minor=savings.annual_recurring_savings.amount,
        first_year_net_savings_minor=savings.first_year_net_savings.amount,
        is_provisional=savings.is_provisional,
        assumptions=savings.assumptions,
        label=savings.label,
    )
