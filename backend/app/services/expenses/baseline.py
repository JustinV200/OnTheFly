"""Computes baseline spend figures from grouped transactions and cadence.
All monetary math stays in Money objects and integer minor units.
"""

from pydantic import BaseModel

from app.core.money import Money
from app.models.transaction import Transaction
from app.services.expenses.recurrence import RecurrenceResult


class BaselineResult(BaseModel):
    """Summarizes per-period and annualized cost for one vendor group."""

    amount_per_period: Money
    annualized_cost: Money
    supporting_transaction_ids: list[str]
    observation_window_days: int

    model_config = {"arbitrary_types_allowed": True}


ANNUAL_PERIODS = {
    "weekly": 52,
    "biweekly": 26,
    "monthly": 12,
    "quarterly": 4,
    "irregular": 1,
    "insufficient_data": 1,
}



def compute_baseline(
    transactions: list[Transaction],
    recurrence: RecurrenceResult,
) -> BaselineResult:
    """Compute baseline amounts from deterministic averages over the grouped data."""

    ordered = sorted(transactions, key=lambda transaction: transaction.posted_at)
    average_amount = sum(transaction.amount_minor for transaction in ordered) // len(ordered)
    currency = ordered[0].currency
    amount_per_period = Money(amount=average_amount, currency=currency)
    annualized_cost = amount_per_period.multiply_by(ANNUAL_PERIODS[recurrence.cadence])
    observation_window_days = (ordered[-1].posted_at.date() - ordered[0].posted_at.date()).days

    return BaselineResult(
        amount_per_period=amount_per_period,
        annualized_cost=annualized_cost,
        supporting_transaction_ids=[transaction.id for transaction in ordered],
        observation_window_days=observation_window_days,
    )
