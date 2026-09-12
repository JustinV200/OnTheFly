"""Builds the owner-only spend-signals report for one grouped expense.
It explains the baseline and flags charges for review; it changes no stored data.
"""

from datetime import datetime

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.service_expense import ServiceExpense
from app.models.transaction import Transaction
from app.services.expenses.baseline import BaselineBasis, compute_baseline
from app.services.expenses.recurrence import detect_recurrence
from app.services.expenses.signals import (
    ChargeNovelty,
    ChargeStatus,
    NotAssessedReason,
    PriceLevelAnalysis,
    analyze_price_levels,
    score_charge_novelty,
)
from app.services.flybrain import FlyBrainAttribution, FlyBrainComponent, attribute


class BaselineExplanation(BaseModel):
    """Which charges the dashboard baseline came from, and which were left out and why."""

    basis: BaselineBasis
    amount_minor: int
    currency: str
    cadence: str
    basis_started_at: datetime
    supporting_transaction_ids: list[str]
    excluded_one_off_transaction_ids: list[str]
    excluded_unconfirmed_transaction_ids: list[str]


class SpendSignalsReport(BaseModel):
    """Everything the fly-brain circuits read from one expense's charges."""

    expense_id: str
    vendor: str
    baseline: BaselineExplanation
    price_levels: PriceLevelAnalysis
    charges: list[ChargeNovelty]
    unusual_charge_count: int
    fly_brain: list[FlyBrainAttribution]


def build_spend_signals(expense: ServiceExpense, db: Session) -> SpendSignalsReport:
    """Analyze the transactions behind one owner expense.

    Assumes the caller already checked that the acting account owns the expense.
    Transactions are matched on the group key sync uses, so the report explains
    exactly the charges behind the stored baseline.
    """

    transactions = db.scalars(
        select(Transaction).where(
            Transaction.owner_account_id == expense.owner_account_id,
            Transaction.normalized_vendor == expense.normalized_vendor,
        )
    ).all()
    if not transactions:
        raise ValueError(f"Expense {expense.id} has no supporting transactions")

    recurrence = detect_recurrence(list(transactions))
    baseline = compute_baseline(list(transactions), recurrence)
    price_levels = analyze_price_levels(list(transactions), recurrence.cadence)
    charges = score_charge_novelty(list(transactions), has_stable_pattern=price_levels.is_assessed)
    uses_price_levels = baseline.basis is BaselineBasis.current_price_level

    return SpendSignalsReport(
        expense_id=expense.id,
        vendor=expense.owner_corrected_vendor or expense.normalized_vendor,
        baseline=BaselineExplanation(
            basis=baseline.basis,
            amount_minor=baseline.amount_per_period.amount,
            currency=baseline.amount_per_period.currency,
            cadence=expense.cadence,
            basis_started_at=baseline.basis_started_at,
            supporting_transaction_ids=baseline.supporting_transaction_ids,
            excluded_one_off_transaction_ids=price_levels.one_off_transaction_ids if uses_price_levels else [],
            excluded_unconfirmed_transaction_ids=(
                price_levels.pending_change.transaction_ids
                if uses_price_levels and price_levels.pending_change is not None
                else []
            ),
        ),
        price_levels=price_levels,
        charges=charges,
        unusual_charge_count=sum(1 for charge in charges if charge.status is ChargeStatus.unusual),
        fly_brain=[
            _compound_eye_attribution(price_levels),
            attribute(
                FlyBrainComponent.mushroom_body_novelty,
                (
                    "Compared each charge with the vendor's earlier charges and flagged ones that look unlike them."
                    if price_levels.is_assessed
                    else "Scored each charge against earlier ones, but flags nothing: this vendor has no stable pattern."
                ),
            ),
        ],
    )


# Written for the owner. A circuit that could not find a price level is still listed
# with the reason, so the report never implies a price check succeeded when it didn't.
NOT_ASSESSED_EXPLANATIONS: dict[NotAssessedReason, str] = {
    NotAssessedReason.cadence_not_recurring: "Not run: this spend doesn't recur on a regular schedule",
    NotAssessedReason.too_few_charges: "Not run: fewer than 3 charges",
    NotAssessedReason.mixed_currency: "Not run: charges are in more than one currency",
    NotAssessedReason.amounts_too_variable: "Ran, but found no stable price: amounts differ from charge to charge",
}


def _compound_eye_attribution(price_levels: PriceLevelAnalysis) -> FlyBrainAttribution:
    if price_levels.is_assessed:
        return attribute(
            FlyBrainComponent.compound_eye,
            "Separated real price changes from one-off charges and chose the charges the baseline uses.",
        )
    explanation = (
        NOT_ASSESSED_EXPLANATIONS[price_levels.not_assessed_reason]
        if price_levels.not_assessed_reason is not None
        else "Not run"
    )
    return attribute(FlyBrainComponent.compound_eye, f"{explanation}; the baseline is the average of all charges.")
