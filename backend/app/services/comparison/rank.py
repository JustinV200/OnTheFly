"""Ranks challenges by scope completeness first and normalized price second, each against the scope version it answered.
It also injects the incumbent baseline row, priced on the listing's current scope, for owner-side comparisons.
"""

from collections.abc import Mapping, Sequence

from pydantic import BaseModel

from app.core.cadence import convert_cadence, to_monthly
from app.core.money import Money
from app.models.challenge import Challenge
from app.models.listing import ScopeVersion
from app.models.service_expense import ServiceExpense
from app.services.comparison.currency import currency_mismatch_reason
from app.services.comparison.normalize import normalize_to_monthly
from app.services.comparison.ordering import offer_sort_key
from app.services.comparison.requirement_completeness import RequirementContext, score_scope
from app.services.comparison.savings import SavingsResult, compute_savings
from app.services.listings.current_price import resolve_task_price


class RankedChallenge(BaseModel):
    """Represents one ranked comparison row for inbox and comparison views."""

    challenge_id: str | None
    challenger_account_id: str | None
    is_incumbent: bool
    # None only on the baseline row of a task with no stated price (a new task without a budget).
    normalized_price: Money | None
    # The monthly price this row is measured against: the one confirmed on the scope version the offer
    # answered. After a re-scope that is an earlier price than the incumbent row's. None when there is no price.
    baseline_monthly: Money | None
    scope_completeness: float
    missing_items: list[str]
    added_items: list[str]
    unstated_items: list[str]
    savings: SavingsResult | None
    # Set when the offer can't be compared with its baseline; such a row carries no savings and ranks last.
    unranked_reason: str | None
    answered_scope_version_number: int
    is_current_scope_version: bool
    provenance: str
    bidding_mode_at_submission: str | None

    model_config = {"arbitrary_types_allowed": True}


def rank_challenges(
    challenges: Sequence[Challenge],
    current_scope: ScopeVersion,
    current_expense: ServiceExpense | None,
    answered_scopes: Mapping[str, ScopeVersion],
    requirement_context: RequirementContext | None = None,
    savings_label: str = "Potential savings",
) -> list[RankedChallenge]:
    """Rank challenges with the incumbent baseline row included first.

    answered_scopes must hold every challenge's scope_version_id (load_answered_scopes builds it). Each
    offer's completeness and savings come from that version; current_scope only prices the incumbent row,
    so editing scope never reframes an existing offer (CLAUDE.md, marketplace mechanics). Offers follow
    offer_sort_key: current-scope offers, then earlier-scope offers, then unranked ones.
    current_expense is None for a new task or piece, whose baseline is the scope's stated budget or cut.
    requirement_context scores completeness from per-requirement responses where the version has requirement rows.
    """

    current_monthly = _monthly_baseline(current_expense, current_scope)
    incumbent = RankedChallenge(
        challenge_id=None,
        challenger_account_id=None,
        is_incumbent=True,
        normalized_price=current_monthly,
        baseline_monthly=current_monthly,
        scope_completeness=1.0,
        missing_items=[],
        added_items=[],
        unstated_items=[],
        savings=None,
        unranked_reason=None,
        answered_scope_version_number=current_scope.version_number,
        is_current_scope_version=True,
        provenance="incumbent_baseline",
        bidding_mode_at_submission=None,
    )

    challenge_rows = [
        _rank_one(
            challenge,
            _answered_scope(challenge, answered_scopes),
            current_scope,
            current_expense,
            requirement_context,
            savings_label,
        )
        for challenge in challenges
    ]
    challenge_rows.sort(
        key=lambda row: offer_sort_key(
            is_ranked=row.unranked_reason is None,
            is_current_scope_version=row.is_current_scope_version,
            answered_scope_version_number=row.answered_scope_version_number,
            scope_completeness=row.scope_completeness,
            normalized_price_minor=row.normalized_price.amount if row.normalized_price is not None else 0,
        )
    )
    return [incumbent, *challenge_rows]


def _rank_one(
    challenge: Challenge,
    answered_scope: ScopeVersion,
    current_scope: ScopeVersion,
    expense: ServiceExpense | None,
    requirement_context: RequirementContext | None,
    savings_label: str,
) -> RankedChallenge:
    normalized = normalize_to_monthly(challenge)
    completeness = score_scope(challenge, answered_scope, requirement_context)
    baseline_monthly = _monthly_baseline(expense, answered_scope)

    # A row in another currency would make Money raise and take down every offer on the listing,
    # so it is kept visible without savings instead (existing rows can predate currency pinning).
    unranked_reason = (
        currency_mismatch_reason(normalized.monthly_price.currency, baseline_monthly.currency)
        if baseline_monthly is not None
        else None
    )
    savings = None
    # No baseline (a new task without a budget) means there is nothing to compare against, so no figure at all.
    if unranked_reason is None and baseline_monthly is not None:
        savings = compute_savings(
            current_monthly=baseline_monthly,
            offer_monthly=normalized.monthly_price,
            setup_fee_minor=challenge.setup_fee_minor if challenge.setup_fee_minor != 0 else None,
            missing_scope_items=completeness.missing_items,
            unstated_scope_items=completeness.unstated_items,
            label_base=savings_label,
            annual_recurring_difference=_annual_difference(expense, answered_scope, challenge),
        )

    return RankedChallenge(
        challenge_id=challenge.id,
        challenger_account_id=challenge.challenger_account_id,
        is_incumbent=False,
        normalized_price=normalized.monthly_price,
        baseline_monthly=baseline_monthly,
        scope_completeness=completeness.score,
        missing_items=completeness.missing_items,
        added_items=completeness.added_items,
        unstated_items=completeness.unstated_items,
        savings=savings,
        unranked_reason=unranked_reason,
        answered_scope_version_number=answered_scope.version_number,
        is_current_scope_version=answered_scope.id == current_scope.id,
        provenance=challenge.provenance,
        bidding_mode_at_submission=challenge.bidding_mode_at_submission,
    )


def _monthly_baseline(expense: ServiceExpense | None, scope: ScopeVersion) -> Money | None:
    # Same resolver the public listing uses, so the baseline matches the price published on that version.
    # Draft creation already rejected cadences with no monthly figure, so this does not raise
    # for a scope version that went through the publish flow.
    current_price = resolve_task_price(expense, scope)
    if current_price is None:
        return None
    return to_monthly(current_price.amount, current_price.cadence)


def _annual_difference(expense: ServiceExpense | None, scope: ScopeVersion, challenge: Challenge) -> Money | None:
    # Each side restated per year from its own cadence and rounded once, so a yearly baseline and a yearly offer differ by
    # exactly their stated amounts; ordering still uses the monthly figures. Called only once a baseline resolved and the
    # currencies matched, so neither lookup nor subtraction can fail here.
    current_price = resolve_task_price(expense, scope)
    if current_price is None:
        return None
    baseline_annual = convert_cadence(current_price.amount, current_price.cadence, "annual")
    offer_annual = convert_cadence(Money(amount=challenge.price_minor, currency=challenge.price_currency), challenge.billing_frequency, "annual")
    return baseline_annual.subtract(offer_annual)


def _answered_scope(challenge: Challenge, answered_scopes: Mapping[str, ScopeVersion]) -> ScopeVersion:
    scope = answered_scopes.get(challenge.scope_version_id)
    if scope is None:
        # Falling back to the current scope is exactly the reframing this module exists to prevent.
        raise LookupError(
            f"Challenge {challenge.id} answered scope version {challenge.scope_version_id}, which was not supplied"
        )
    return scope
