"""Applies an owner-confirmed merge of one vendor group into another.
The merge is recorded as ordinary correction rules, so it persists across future imports.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.service_expense import ServiceExpense
from app.models.transaction import Transaction
from app.models.vendor_correction import CorrectionMatchMode
from app.services.expenses.aliases.errors import AliasRequestError
from app.services.expenses.aliases.regroup_scope import merge_regroup_refusal, snapshot_group_keys
from app.services.expenses.listing_references import listed_expense_ids
from app.services.expenses.sync import sync_service_expenses
from app.services.expenses.vendor_group_key import base_vendor_name
from app.services.expenses.vendor_normalize import VendorCorrectionStore


def merge_vendor_alias(
    owner_account_id: str,
    alias_expense_id: str,
    canonical_expense_id: str,
    db: Session,
) -> ServiceExpense:
    """Fold the alias group into the canonical group and return the re-synced canonical expense.

    Only explicit owner action reaches this function; suggestions never call it. It
    refuses a merge that would delete an expense the listing flow references, or mix
    currencies. The rules match the alias's exact descriptors only. The rules and the
    regroup commit together only once every alias charge sits in the canonical group and
    no other transaction changed group; otherwise everything rolls back and the merge is
    refused, with its own message when the other group has listing history. Merging never
    changes visibility: the canonical expense keeps its own state and any listing keeps
    its stored public projection. An owner's not-publishable mark on the alias does carry
    to the canonical expense, because sync never drops a less publishable choice in a
    regroup; a refused merge rolls that back with everything else.
    """

    alias = _get_owned_expense(alias_expense_id, owner_account_id, db)
    canonical = _get_owned_expense(canonical_expense_id, owner_account_id, db)
    if alias.id == canonical.id:
        raise AliasRequestError("An expense cannot be merged into itself")
    if alias.currency != canonical.currency:
        raise AliasRequestError("Expenses in different currencies cannot be merged")
    if alias.id in listed_expense_ids([alias.id], db):
        raise AliasRequestError(
            "This expense has listing history, so it can't be merged away. Merge the other expense into it instead."
        )

    raw_descriptions = sorted(
        set(
            db.scalars(
                select(Transaction.raw_description).where(
                    Transaction.owner_account_id == owner_account_id,
                    Transaction.normalized_vendor == alias.normalized_vendor,
                )
            ).all()
        )
    )
    if not raw_descriptions:
        raise AliasRequestError("The expense to merge has no transactions; refresh the dashboard and try again")

    # Read before the regroup: sync rewrites these rows in place.
    canonical_id = canonical.id
    alias_key = alias.normalized_vendor
    canonical_key = canonical.normalized_vendor
    expected_period_count = canonical.period_count + alias.period_count
    before = snapshot_group_keys(owner_account_id, db)

    # One exact-match rule per descriptor the alias group was built from. A whole-word rule
    # would also claim any longer descriptor containing it ("SPARKLE" in "SPARKLE WINDOWS")
    # and fold a vendor the owner never chose into the canonical group.
    # Rules store the currency-free name: sync adds the Stripe " [CUR]" suffix itself, so
    # storing the suffixed key would regroup the alias under "Name [USD] [USD]".
    store = VendorCorrectionStore()
    canonical_vendor = base_vendor_name(canonical_key, canonical.currency)
    for raw_description in raw_descriptions:
        store.upsert(
            owner_account_id=owner_account_id,
            raw_description_pattern=raw_description,
            corrected_vendor=canonical_vendor,
            corrected_category=None,
            db=db,
            match_mode=CorrectionMatchMode.exact,
        )
    # upsert() flushes each new rule, so the sync below reads them all back. It must not
    # commit: a merge that doesn't land has to leave neither rules nor regroup behind.
    sync_service_expenses(owner_account_id, db, commit=False)

    # Exact rules can still reach outside the alias group: the same descriptor from another
    # provider forms its own group. Any such move is refused before anything commits.
    refusal = merge_regroup_refusal(
        owner_account_id, before, snapshot_group_keys(owner_account_id, db), alias_key, canonical_key, db
    )
    if refusal is not None:
        db.rollback()
        raise AliasRequestError(refusal)

    merged = db.scalar(
        select(ServiceExpense).where(
            ServiceExpense.id == canonical_id,
            ServiceExpense.owner_account_id == owner_account_id,
        )
    )
    if merged is None or merged.normalized_vendor != canonical_key or merged.period_count != expected_period_count:
        # The moves themselves were checked above. This confirms the canonical row still exists
        # under its key and that its recomputed count is the sum the owner saw on the two rows,
        # which fails when those stored figures were stale before the merge.
        db.rollback()
        raise AliasRequestError(
            "These expenses can't be merged: the merge wouldn't move exactly the other expense's charges "
            "into this one. Nothing was changed."
        )
    db.commit()
    return merged


def _get_owned_expense(expense_id: str, owner_account_id: str, db: Session) -> ServiceExpense:
    expense = db.scalar(
        select(ServiceExpense).where(
            ServiceExpense.id == expense_id,
            ServiceExpense.owner_account_id == owner_account_id,
        )
    )
    if expense is None:
        raise AliasRequestError("Expense not found", is_not_found=True)
    return expense
