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
from app.services.expenses.baseline_charges import baseline_charges
from app.services.expenses.recurrence import detect_recurrence
from app.services.expenses.signals import (
    ChargeNovelty,
    ChargeStatus,
    NotAssessedReason,
    PriceLevelAnalysis,
    analyze_price_levels,
    not_assessed_price_levels,
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


class NotAnalyzedTransaction(BaseModel):
    """A stored row of this vendor group that no circuit read, with the status that kept it out."""

    transaction_id: str
    status: str
    direction: str


class SpendSignalsReport(BaseModel):
    """Everything the fly-brain circuits read from one expense's charges."""

    expense_id: str
    vendor: str
    # None when the group has no posted charges (sync's no_posted_debits state). A zero
    # amount would read as a real price, so the report says there is no baseline instead.
    baseline: BaselineExplanation | None
    price_levels: PriceLevelAnalysis
    charges: list[ChargeNovelty]
    unusual_charge_count: int
    # Pending, void, and credit rows of a Stripe group, listed so the report never implies it read them.
    not_analyzed_transactions: list[NotAnalyzedTransaction]
    fly_brain: list[FlyBrainAttribution]


def build_spend_signals(expense: ServiceExpense, db: Session) -> SpendSignalsReport:
    """Analyze the transactions behind one owner expense.

    Assumes the caller already checked that the acting account owns the expense.
    Transactions are matched on the group key sync uses and filtered with the same
    baseline_charges rule, so the report explains exactly the charges behind the
    stored baseline. Raises ValueError when the group has no stored transactions at all.
    """

    transactions = list(
        db.scalars(
            select(Transaction).where(
                Transaction.owner_account_id == expense.owner_account_id,
                Transaction.normalized_vendor == expense.normalized_vendor,
            )
        ).all()
    )
    if not transactions:
        raise ValueError(f"Expense {expense.id} has no supporting transactions")

    charge_transactions = baseline_charges(transactions)
    not_analyzed = _not_analyzed(transactions, charge_transactions)
    vendor = expense.owner_corrected_vendor or expense.normalized_vendor
    if not charge_transactions:
        return _no_posted_charges_report(expense.id, vendor, not_analyzed)

    recurrence = detect_recurrence(charge_transactions)
    baseline = compute_baseline(charge_transactions, recurrence)
    price_levels = analyze_price_levels(charge_transactions, recurrence.cadence)
    charges = score_charge_novelty(charge_transactions, has_stable_pattern=price_levels.is_assessed)
    uses_price_levels = baseline.basis is BaselineBasis.current_price_level

    return SpendSignalsReport(
        expense_id=expense.id,
        vendor=vendor,
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
        not_analyzed_transactions=not_analyzed,
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


def _no_posted_charges_report(
    expense_id: str,
    vendor: str,
    not_analyzed: list[NotAnalyzedTransaction],
) -> SpendSignalsReport:
    # Mirrors sync's no_posted_debits state. Void and pending rows are never analyzed in
    # place of posted ones, and both circuits stay listed with the reason they didn't run.
    price_levels = not_assessed_price_levels(NotAssessedReason.no_posted_charges)
    return SpendSignalsReport(
        expense_id=expense_id,
        vendor=vendor,
        baseline=None,
        price_levels=price_levels,
        charges=[],
        unusual_charge_count=0,
        not_analyzed_transactions=not_analyzed,
        fly_brain=[
            _compound_eye_attribution(price_levels),
            attribute(
                FlyBrainComponent.mushroom_body_novelty,
                "Not run: no posted charges to compare, only pending, void, or credit rows.",
            ),
        ],
    )


def _not_analyzed(
    transactions: list[Transaction],
    charge_transactions: list[Transaction],
) -> list[NotAnalyzedTransaction]:
    read_ids = {transaction.id for transaction in charge_transactions}
    ordered = sorted(transactions, key=lambda transaction: (transaction.posted_at, transaction.id))
    return [
        NotAnalyzedTransaction(
            transaction_id=transaction.id,
            status=transaction.status,
            direction=transaction.direction,
        )
        for transaction in ordered
        if transaction.id not in read_ids
    ]


# Written for the owner. A circuit that could not find a price level is still listed
# with the reason, so the report never implies a price check succeeded when it didn't.
NOT_ASSESSED_EXPLANATIONS: dict[NotAssessedReason, str] = {
    NotAssessedReason.cadence_not_recurring: "Not run: this spend doesn't recur on a regular schedule",
    NotAssessedReason.too_few_charges: "Not run: fewer than 3 charges",
    NotAssessedReason.mixed_currency: "Not run: charges are in more than one currency",
    NotAssessedReason.amounts_too_variable: "Ran, but found no stable price: amounts differ from charge to charge",
    NotAssessedReason.no_posted_charges: "Not run: no posted charges, only pending, void, or credit rows",
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
    # Without posted charges there is no average to fall back to either.
    if price_levels.not_assessed_reason is NotAssessedReason.no_posted_charges:
        return attribute(FlyBrainComponent.compound_eye, f"{explanation}; there is no baseline to explain.")
    return attribute(FlyBrainComponent.compound_eye, f"{explanation}; the baseline is the average of all charges.")
