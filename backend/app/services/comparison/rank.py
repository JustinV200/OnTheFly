"""Ranks challenges by scope completeness first and normalized price second.
It also injects the incumbent baseline row used by owner-side comparisons.
"""

from pydantic import BaseModel

from app.core.money import Money
from app.models.challenge import Challenge
from app.models.listing import ScopeVersion
from app.models.service_expense import ServiceExpense
from app.services.comparison.normalize import is_scope_complete, normalize_to_monthly
from app.services.comparison.savings import SavingsResult, compute_savings


class RankedChallenge(BaseModel):
    """Represents one ranked comparison row for inbox and comparison views."""

    challenge_id: str | None
    challenger_account_id: str | None
    is_incumbent: bool
    normalized_price: Money
    scope_completeness: float
    missing_items: list[str]
    added_items: list[str]
    unstated_items: list[str]
    savings: SavingsResult | None
    provenance: str
    bidding_mode_at_submission: str | None

    model_config = {"arbitrary_types_allowed": True}



def rank_challenges(
    challenges: list[Challenge],
    scope_version: ScopeVersion,
    current_expense: ServiceExpense,
) -> list[RankedChallenge]:
    """Rank challenges with the incumbent baseline row included first."""

    current_monthly = Money(
        amount=current_expense.amount_minor_per_period,
        currency=current_expense.currency,
    )
    ranked: list[RankedChallenge] = [
        RankedChallenge(
            challenge_id=None,
            challenger_account_id=None,
            is_incumbent=True,
            normalized_price=current_monthly,
            scope_completeness=1.0,
            missing_items=[],
            added_items=[],
            unstated_items=[],
            savings=None,
            provenance="incumbent_baseline",
            bidding_mode_at_submission=None,
        )
    ]

    challenge_rows = []
    for challenge in challenges:
        normalized = normalize_to_monthly(challenge)
        completeness = is_scope_complete(challenge, scope_version)
        savings = compute_savings(
            current_monthly=current_monthly,
            offer_monthly=normalized.monthly_price,
            setup_fee_minor=challenge.setup_fee_minor if challenge.setup_fee_minor != 0 else None,
        )
        challenge_rows.append(
            RankedChallenge(
                challenge_id=challenge.id,
                challenger_account_id=challenge.challenger_account_id,
                is_incumbent=False,
                normalized_price=normalized.monthly_price,
                scope_completeness=completeness.score,
                missing_items=completeness.missing_items,
                added_items=completeness.added_items,
                unstated_items=completeness.unstated_items,
                savings=savings,
                provenance=challenge.provenance,
                bidding_mode_at_submission=challenge.bidding_mode_at_submission,
            )
        )

    ranked.extend(
        sorted(
            challenge_rows,
            key=lambda row: (-row.scope_completeness, row.normalized_price.amount),
        )
    )
    return ranked
