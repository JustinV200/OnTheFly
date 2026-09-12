"""Works out which of a vendor's transactions the stored expense baseline was taken from, for the trace.
It reruns the dashboard's own baseline code over the same charges sync used; it stores and changes nothing.
"""

from collections.abc import Sequence

from app.models.transaction import Transaction
from app.services.expenses.baseline import compute_baseline
from app.services.expenses.recurrence import detect_recurrence


def baseline_transaction_ids(vendor_transactions: Sequence[Transaction]) -> set[str]:
    """Return the ids of the transactions the expense's per-period baseline amount was computed from.

    Assumes `vendor_transactions` is the whole group sync filed under the expense's vendor key. Refunds,
    unsettled Stripe rows, and charges outside the current price level are left out, exactly as the
    baseline leaves them out. An empty set means nothing supports the baseline (sync zeroed the expense).
    """

    charges = _baseline_charges(vendor_transactions)
    if not charges:
        return set()
    recurrence = detect_recurrence(charges)
    return set(compute_baseline(charges, recurrence).supporting_transaction_ids)


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
