"""Works out which of a vendor's transactions the stored expense baseline was taken from, for the trace.
It reruns the dashboard's own baseline code over the same charges sync used; it stores and changes nothing.
"""

from collections.abc import Sequence

from pydantic import BaseModel

from app.models.transaction import Transaction
from app.services.expenses.baseline import BaselineBasis, compute_baseline
from app.services.expenses.recurrence import detect_recurrence
from app.services.expenses.signals import NotAssessedReason, analyze_price_levels, did_compound_eye_run


class BaselineMembership(BaseModel):
    """Which transactions the baseline counts, and how they were chosen.

    With basis current_price_level the Compound Eye chose the counted charges; with average_of_charges it
    found no price level and the baseline is the plain average. The trace labels both cases.
    """

    transaction_ids: set[str]
    # None when the group has no charges sync would count, so no baseline (and no Compound Eye run) exists.
    basis: BaselineBasis | None
    # Why the Compound Eye found no current price level; None when it found one or never ran.
    not_assessed_reason: NotAssessedReason | None
    # Whether the detector read the charges at all (it also runs when it finds no stable price); the brain panel
    # replays the charges as the Compound Eye's input only when it did.
    did_compound_eye_run: bool


def find_baseline_membership(vendor_transactions: Sequence[Transaction]) -> BaselineMembership:
    """Return the transactions the expense's per-period baseline was computed from, with the basis used.

    Assumes `vendor_transactions` is the whole group sync filed under the expense's vendor key. Refunds,
    unsettled Stripe rows, and charges outside the current price level are left out, exactly as the
    baseline leaves them out. No ids and a None basis mean nothing supports the baseline (sync zeroed it).
    """

    charges = _baseline_charges(vendor_transactions)
    if not charges:
        return BaselineMembership(
            transaction_ids=set(),
            basis=None,
            not_assessed_reason=None,
            did_compound_eye_run=False,
        )

    recurrence = detect_recurrence(charges)
    baseline = compute_baseline(charges, recurrence)
    # compute_baseline runs this same deterministic analysis but keeps only the outcome; rerunning it on the
    # same charges recovers the reason no price level was found, so the trace can say why the circuit didn't run.
    price_levels = analyze_price_levels(charges, recurrence.cadence)
    return BaselineMembership(
        transaction_ids=set(baseline.supporting_transaction_ids),
        basis=baseline.basis,
        not_assessed_reason=price_levels.not_assessed_reason,
        did_compound_eye_run=did_compound_eye_run(price_levels),
    )


def _baseline_charges(vendor_transactions: Sequence[Transaction]) -> list[Transaction]:
    # Mirrors the charge selection in sync_service_expenses (expenses/sync.py): a group with any Stripe
    # row counts only posted debits, since Stripe also sends pending, void, and credit rows for audit;
    # other sources count every row. Keep the two in step, or the trace marks rows sync didn't use.
    if any(transaction.provider == "stripe" for transaction in vendor_transactions):
        return [
            transaction
            for transaction in vendor_transactions
            if transaction.status == "posted" and transaction.direction == "debit"
        ]
    return list(vendor_transactions)
