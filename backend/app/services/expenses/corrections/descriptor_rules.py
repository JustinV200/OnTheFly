"""Writes an owner's vendor or category correction as correction rules keyed by the expense's bank descriptors.
Rules are matched against raw transaction text, so they are built from the group's descriptors, never its group key.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.service_expense import ServiceExpense
from app.models.transaction import Transaction
from app.models.vendor_correction import CorrectionMatchMode
from app.services.expenses.vendor_group_key import base_vendor_name
from app.services.expenses.vendor_normalize import VendorCorrectionStore


def upsert_descriptor_corrections(
    expense: ServiceExpense,
    corrected_vendor: str | None,
    corrected_category: str | None,
    db: Session,
) -> None:
    """Upsert one rule per distinct raw descriptor grouped under the expense, carrying the given corrections.

    None means "not correcting this field": that target keeps whatever the descriptor resolves to
    today, so a category-only correction never undoes an earlier rename or alias merge. Does nothing
    when both are None. The rules apply owner-wide, so the same descriptor from another provider is
    corrected too. Flushes new rules through the store; the caller commits.
    """

    if corrected_vendor is None and corrected_category is None:
        return

    # A Stripe group key ("City Of License [USD]") appears in no bank descriptor, so a rule keyed by
    # it never matched and every sync reverted the correction. Same selection as the alias merge.
    raw_descriptions = sorted(
        set(
            db.scalars(
                select(Transaction.raw_description).where(
                    Transaction.owner_account_id == expense.owner_account_id,
                    Transaction.normalized_vendor == expense.normalized_vendor,
                )
            ).all()
        )
    )
    # Rules store the currency-free name; sync adds the Stripe " [CUR]" suffix itself.
    rule_vendor = base_vendor_name(corrected_vendor, expense.currency) if corrected_vendor is not None else None
    store = VendorCorrectionStore()
    for raw_description in raw_descriptions:
        current = store.matching_rule(expense.owner_account_id, raw_description, db)
        is_same_pattern = (
            current is not None and current.raw_description_pattern.casefold() == raw_description.casefold()
        )
        store.upsert(
            owner_account_id=expense.owner_account_id,
            raw_description_pattern=raw_description,
            corrected_vendor=rule_vendor or (current.corrected_vendor if current else None),
            corrected_category=corrected_category or (current.corrected_category if current else None),
            db=db,
            # A new rule is exact, like a merge rule, so "SPARKLE" never claims "SPARKLE WINDOWS". An
            # existing rule for this very descriptor keeps its mode: narrowing a stored whole-word
            # rule to exact would silently undo what it already groups.
            match_mode=CorrectionMatchMode(current.match_mode) if is_same_pattern else CorrectionMatchMode.exact,
        )
