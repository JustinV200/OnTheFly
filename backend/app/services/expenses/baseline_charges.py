"""Selects which of a vendor group's stored transactions count as charges for its baseline.
Sync and the spend-signals report both use it, so the stored baseline and the fly-brain panel read the same rows.
"""

from app.models.transaction import Transaction


def baseline_charges(transactions: list[Transaction]) -> list[Transaction]:
    """Return the transactions a vendor group's baseline, recurrence, and signals are computed from.

    Assumes the transactions are one vendor group. A group with any Stripe row keeps only
    posted debits: the Stripe source imports pending and void payments on purpose, so a
    later status update can correct the stored row, and none of them (nor a credit) is a
    charge the owner paid. Other providers keep every row, which is how sync has always
    grouped fixture data; baseline and price-level code set credits aside themselves.

    The result can be empty. Callers treat that as "no posted charges", never as a zero price.
    """

    is_stripe_group = any(transaction.provider == "stripe" for transaction in transactions)
    if not is_stripe_group:
        return list(transactions)
    return [
        transaction
        for transaction in transactions
        if transaction.status == "posted" and transaction.direction == "debit"
    ]
