"""Applies an owner-confirmed merge of one vendor group into another.
The merge is recorded as ordinary correction rules, so it persists across future imports.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.service_expense import ServiceExpense
from app.models.transaction import Transaction
from app.services.expenses.aliases.errors import AliasRequestError
from app.services.expenses.listing_references import listed_expense_ids
from app.services.expenses.sync import sync_service_expenses
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
    currencies. Merging never changes visibility: the canonical expense keeps its own
    state and any listing keeps its stored public projection.
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

    # One rule per exact descriptor the alias group was built from. Exact descriptors
    # (not the alias's display name) make the rules match only these payees' charges.
    store = VendorCorrectionStore()
    canonical_vendor = canonical.normalized_vendor
    for raw_description in raw_descriptions:
        store.upsert(
            owner_account_id=owner_account_id,
            raw_description_pattern=raw_description,
            corrected_vendor=canonical_vendor,
            corrected_category=None,
            db=db,
        )
    # upsert() flushes each new rule, so the sync below reads them all back.
    sync_service_expenses(owner_account_id, db)
    merged = db.scalar(
        select(ServiceExpense).where(
            ServiceExpense.owner_account_id == owner_account_id,
            ServiceExpense.normalized_vendor == canonical_vendor,
        )
    )
    if merged is None:
        raise RuntimeError(f"Merged expense '{canonical_vendor}' disappeared during re-sync")
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
