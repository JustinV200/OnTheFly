"""Checks that an alias merge's re-sync moved exactly the alias group's charges into the canonical group.
It compares where each of the owner's transactions was grouped before and after the merge; it never writes.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.service_expense import ServiceExpense
from app.models.transaction import Transaction
from app.services.expenses.listing_references import listed_expense_ids


def snapshot_group_keys(owner_account_id: str, db: Session) -> dict[str, str | None]:
    """Return the group key each of the owner's transactions is stored under, by transaction id.

    Reads flushed database state, so take one snapshot before the merge adds its rules and
    another after the flush-only re-sync.
    """

    rows = db.execute(
        select(Transaction.id, Transaction.normalized_vendor).where(Transaction.owner_account_id == owner_account_id)
    ).all()
    return {row.id: row.normalized_vendor for row in rows}


def merge_regroup_refusal(
    owner_account_id: str,
    before: dict[str, str | None],
    after: dict[str, str | None],
    alias_key: str,
    canonical_key: str,
    db: Session,
) -> str | None:
    """Return why the merge's regroup must be refused, or None when it moved only what the owner chose.

    Allowed: every transaction grouped under alias_key now sits under canonical_key, and every
    other transaction kept its group. A move out of any other group is refused because the
    owner never clicked to merge it; when that group's expense has listing history the refusal
    says so. Call it after the flush-only sync and before commit; the caller rolls back.
    """

    # A transaction with no stored key was never synced, so it belongs to no expense yet and the
    # re-sync groups it exactly as the next import would; only moves out of a real group count.
    stray_keys = {
        key
        for transaction_id, key in before.items()
        if key is not None and key != alias_key and after.get(transaction_id) != key
    }
    if stray_keys:
        # Listed rows are never deleted as orphans, so they are still found after the flush.
        stray_expense_ids = db.scalars(
            select(ServiceExpense.id).where(
                ServiceExpense.owner_account_id == owner_account_id,
                ServiceExpense.normalized_vendor.in_(stray_keys),
            )
        ).all()
        if listed_expense_ids(list(stray_expense_ids), db):
            return (
                "These expenses can't be merged: the merge would also move charges out of another expense "
                "that has listing history. Nothing was changed."
            )
        return (
            "These expenses can't be merged: the merge would also move charges from other expenses on your "
            "dashboard. Nothing was changed."
        )

    is_alias_fully_moved = all(
        after.get(transaction_id) == canonical_key
        for transaction_id, key in before.items()
        if key == alias_key
    )
    if not is_alias_fully_moved:
        return (
            "These expenses can't be merged: the merge wouldn't move all of the other expense's charges "
            "into this one. Nothing was changed."
        )
    return None
