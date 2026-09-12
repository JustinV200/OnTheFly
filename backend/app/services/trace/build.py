"""Builds the owner-only trace from one offer's potential savings down to individual transactions.
Every figure is recomputed with the inbox's own ranking code, so the trace can't disagree with the inbox.
"""

import json

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.challenge import Challenge, ChallengeRevision
from app.models.listing import PublicListingRecord, ScopeVersion
from app.models.service_expense import ServiceExpense
from app.models.transaction import Transaction
from app.services.comparison.rank import RankedChallenge, rank_challenges
from app.services.listings.current_price import resolve_current_price
from app.services.trace.baseline_membership import baseline_transaction_ids
from app.services.trace.types import (
    OfferTrace,
    TraceBaseline,
    TraceExpense,
    TraceListing,
    TraceOffer,
    TraceSavings,
    TraceScopeVersion,
    TraceTransaction,
)


class TraceNotFoundError(LookupError):
    """Raised when the offer doesn't exist or the acting account doesn't own its listing."""


def build_offer_trace(challenge_id: str, acting_account_id: str, db: Session) -> OfferTrace:
    """Return the full chain for one offer; raises TraceNotFoundError for anyone but the owner.

    Not-found and not-yours raise the same error, so the endpoint can't be used to probe
    which offer ids exist on other businesses' listings.
    """

    challenge = db.get(Challenge, challenge_id)
    listing = db.get(PublicListingRecord, challenge.listing_id) if challenge else None
    if challenge is None or listing is None or listing.owner_account_id != acting_account_id:
        raise TraceNotFoundError(challenge_id)

    expense = db.get(ServiceExpense, listing.expense_id)
    listing_scope = db.get(ScopeVersion, listing.scope_version_id)
    answered_scope = db.get(ScopeVersion, challenge.scope_version_id)
    challenger = db.get(Account, challenge.challenger_account_id)
    if expense is None or listing_scope is None or answered_scope is None or challenger is None:
        raise TraceNotFoundError(challenge_id)

    # The inbox scores each offer against the scope version it answered; ranking this offer alone with
    # that same version gives the identical row and savings, since each offer's savings are independent.
    _, offer_row = rank_challenges([challenge], listing_scope, expense, {answered_scope.id: answered_scope})
    transactions = db.scalars(
        select(Transaction)
        .where(Transaction.owner_account_id == listing.owner_account_id)
        .where(Transaction.normalized_vendor == expense.normalized_vendor)
        .order_by(Transaction.posted_at.desc())
    ).all()
    # The vendor's rows include refunds, unsettled charges, and earlier prices; mark the ones the baseline used.
    counted_ids = baseline_transaction_ids(transactions)

    return OfferTrace(
        savings=_savings(offer_row),
        offer=_offer(challenge, challenger, offer_row, db),
        scope_version=_scope_version(answered_scope, listing),
        listing=_listing(listing, listing_scope),
        # The answered version's price, matching the savings above and the "still answers version N" text.
        baseline=_baseline(expense, answered_scope, offer_row),
        expense=_expense(expense, transactions),
        transactions=[_transaction(transaction, transaction.id in counted_ids) for transaction in transactions],
    )


def _savings(offer_row: RankedChallenge) -> TraceSavings | None:
    # An unranked offer has no savings figure to trace; TraceOffer.unranked_reason says why.
    if offer_row.savings is None:
        return None
    return TraceSavings(
        label=offer_row.savings.label,
        currency=offer_row.baseline_monthly.currency,
        baseline_monthly_minor=offer_row.baseline_monthly.amount,
        offer_monthly_minor=offer_row.normalized_price.amount,
        annual_recurring_savings_minor=offer_row.savings.annual_recurring_savings.amount,
        first_year_net_savings_minor=offer_row.savings.first_year_net_savings.amount,
        is_provisional=offer_row.savings.is_provisional,
        assumptions=offer_row.savings.assumptions,
    )


def _offer(challenge: Challenge, challenger: Account, offer_row: RankedChallenge, db: Session) -> TraceOffer:
    revision_count = db.scalar(
        select(func.count()).select_from(ChallengeRevision).where(ChallengeRevision.challenge_id == challenge.id)
    )
    return TraceOffer(
        challenge_id=challenge.id,
        challenger_name=challenger.business_name,
        provenance=challenge.provenance,
        bidding_mode_at_submission=challenge.bidding_mode_at_submission,
        price_minor=challenge.price_minor,
        price_currency=challenge.price_currency,
        billing_frequency=challenge.billing_frequency,
        normalized_monthly_minor=offer_row.normalized_price.amount,
        setup_fee_minor=challenge.setup_fee_minor,
        scope_included=json.loads(challenge.scope_included),
        scope_excluded=json.loads(challenge.scope_excluded),
        scope_extras=json.loads(challenge.scope_extras),
        scope_completeness=offer_row.scope_completeness,
        missing_items=offer_row.missing_items,
        unstated_items=offer_row.unstated_items,
        unranked_reason=offer_row.unranked_reason,
        submitted_at=challenge.submitted_at,
        revised_at=challenge.revised_at,
        revision_count=int(revision_count or 0),
    )


def _scope_version(scope: ScopeVersion, listing: PublicListingRecord) -> TraceScopeVersion:
    return TraceScopeVersion(
        id=scope.id,
        version_number=scope.version_number,
        created_at=scope.created_at,
        is_listing_current_version=scope.id == listing.scope_version_id,
        service_area=scope.service_area,
        location_approximate=scope.location_approximate,
        square_footage=scope.square_footage,
        visit_frequency=scope.visit_frequency,
        bathroom_count=scope.bathroom_count,
        required_tasks=json.loads(scope.required_tasks) if scope.required_tasks else [],
        supplies_included=scope.supplies_included,
        equipment_included=scope.equipment_included,
        taxes_included=scope.taxes_included,
        current_price_minor=scope.current_price_minor,
        current_price_currency=scope.current_price_currency,
        billing_cadence=scope.billing_cadence,
        challenge_deadline=scope.challenge_deadline,
    )


def _listing(listing: PublicListingRecord, listing_scope: ScopeVersion) -> TraceListing:
    return TraceListing(
        id=listing.id,
        visibility=listing.visibility,
        bidding_mode=listing.bidding_mode,
        category=listing.category,
        price_minor=listing.price_minor,
        price_currency=listing.price_currency,
        billing_cadence=listing.billing_cadence,
        published_at=listing.published_at,
        current_scope_version_number=listing_scope.version_number,
    )


def _baseline(expense: ServiceExpense, scope: ScopeVersion, offer_row: RankedChallenge) -> TraceBaseline:
    current_price = resolve_current_price(expense, scope)
    # Mirrors resolve_current_price's rule: the scope's pair wins only when stated in full.
    is_confirmed = scope.current_price_minor is not None and bool(scope.billing_cadence)
    return TraceBaseline(
        source="owner_confirmed_scope" if is_confirmed else "transaction_baseline",
        amount_minor=current_price.amount.amount,
        currency=current_price.amount.currency,
        cadence=current_price.cadence,
        monthly_minor=offer_row.baseline_monthly.amount,
        confirmed_on_scope_version=scope.version_number if is_confirmed else None,
    )


def _expense(expense: ServiceExpense, transactions: list[Transaction]) -> TraceExpense:
    return TraceExpense(
        id=expense.id,
        vendor=expense.owner_corrected_vendor or expense.normalized_vendor,
        category=expense.owner_corrected_category or expense.category,
        cadence=expense.cadence,
        amount_minor_per_period=expense.amount_minor_per_period,
        annualized_amount_minor=expense.annualized_amount_minor,
        currency=expense.currency,
        period_count=expense.period_count,
        recurrence_confidence=expense.recurrence_confidence,
        first_seen=expense.first_seen,
        last_seen=expense.last_seen,
        provenance=sorted({transaction.source_type for transaction in transactions}),
    )


def _transaction(transaction: Transaction, counts_toward_baseline: bool) -> TraceTransaction:
    return TraceTransaction(
        id=transaction.id,
        posted_at=transaction.posted_at,
        raw_description=transaction.raw_description,
        amount_minor=transaction.amount_minor,
        currency=transaction.currency,
        direction=transaction.direction,
        status=transaction.status,
        source_type=transaction.source_type,
        is_excluded=transaction.is_excluded,
        excluded_reason=transaction.excluded_reason,
        counts_toward_baseline=counts_toward_baseline,
    )
