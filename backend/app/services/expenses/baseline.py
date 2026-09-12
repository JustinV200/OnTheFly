"""Computes baseline spend figures from grouped transactions and cadence.
All monetary math stays in Money objects and integer minor units.
"""

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel

from app.core.money import Money
from app.models.transaction import Transaction
from app.services.expenses.recurrence import RecurrenceResult
from app.services.expenses.signals import analyze_price_levels


class BaselineBasis(StrEnum):
    """Which charges the per-period amount was taken from."""

    # Median of the charges at the current confirmed price level (Compound Eye).
    current_price_level = "current_price_level"
    # Mean of every charge; used when there is no recurring price level to find.
    average_of_charges = "average_of_charges"


class BaselineResult(BaseModel):
    """Summarizes per-period and annualized cost for one vendor group."""

    amount_per_period: Money
    annualized_cost: Money
    supporting_transaction_ids: list[str]
    observation_window_days: int
    basis: BaselineBasis
    basis_started_at: datetime

    model_config = {"arbitrary_types_allowed": True}


ANNUAL_PERIODS = {
    "weekly": 52,
    "biweekly": 26,
    "monthly": 12,
    "bimonthly": 6,
    "quarterly": 4,
    "irregular": 1,
    "insufficient_data": 1,
}



def compute_baseline(
    transactions: list[Transaction],
    recurrence: RecurrenceResult,
) -> BaselineResult:
    """Compute the per-period and annualized baseline for one vendor group.

    A recurring expense uses the current price level, so a past price change or a
    one-off charge doesn't distort what the owner pays now. Everything else keeps
    the mean over its charges. Both paths are integer arithmetic on real charges.
    """

    ordered = sorted(transactions, key=lambda transaction: transaction.posted_at)
    observation_window_days = (ordered[-1].posted_at.date() - ordered[0].posted_at.date()).days
    price_levels = analyze_price_levels(ordered, recurrence.cadence)

    if price_levels.is_assessed and price_levels.current_level_amount_minor is not None:
        amount_per_period = Money(
            amount=price_levels.current_level_amount_minor,
            currency=price_levels.currency or ordered[0].currency,
        )
        supporting_ids = price_levels.current_level_transaction_ids
        basis = BaselineBasis.current_price_level
        basis_started_at = price_levels.current_level_started_at or ordered[0].posted_at
    else:
        # Refunds and credits are not charges at a price. Fall back to every transaction
        # only when the group has no debits at all, so the division always has a count.
        charges = [transaction for transaction in ordered if transaction.direction == "debit"] or ordered
        average_amount = sum(transaction.amount_minor for transaction in charges) // len(charges)
        amount_per_period = Money(amount=average_amount, currency=charges[0].currency)
        supporting_ids = [transaction.id for transaction in charges]
        basis = BaselineBasis.average_of_charges
        basis_started_at = charges[0].posted_at

    return BaselineResult(
        amount_per_period=amount_per_period,
        annualized_cost=amount_per_period.multiply_by(ANNUAL_PERIODS[recurrence.cadence]),
        supporting_transaction_ids=supporting_ids,
        observation_window_days=observation_window_days,
        basis=basis,
        basis_started_at=basis_started_at,
    )
