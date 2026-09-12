"""Records an owner's rejection of a vendor alias suggestion.
Dismissing changes no expense, correction, or visibility; it only silences the suggestion.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.service_expense import ServiceExpense
from app.models.vendor_alias_dismissal import VendorAliasDismissal
from app.services.expenses.aliases.errors import AliasRequestError


def dismiss_vendor_alias(
    owner_account_id: str,
    alias_expense_id: str,
    canonical_expense_id: str,
    db: Session,
) -> VendorAliasDismissal:
    """Store the dismissal once; repeating it (in either direction) returns the existing record."""

    expenses = {
        expense.id: expense
        for expense in db.scalars(
            select(ServiceExpense).where(
                ServiceExpense.owner_account_id == owner_account_id,
                ServiceExpense.id.in_([alias_expense_id, canonical_expense_id]),
            )
        ).all()
    }
    if alias_expense_id not in expenses or canonical_expense_id not in expenses:
        raise AliasRequestError("Expense not found", is_not_found=True)
    if alias_expense_id == canonical_expense_id:
        raise AliasRequestError("A suggestion always pairs two different expenses")

    alias_vendor = expenses[alias_expense_id].normalized_vendor
    canonical_vendor = expenses[canonical_expense_id].normalized_vendor
    existing = db.scalars(
        select(VendorAliasDismissal).where(VendorAliasDismissal.owner_account_id == owner_account_id)
    ).all()
    pair = {alias_vendor, canonical_vendor}
    for dismissal in existing:
        if {dismissal.alias_vendor, dismissal.canonical_vendor} == pair:
            return dismissal

    dismissal = VendorAliasDismissal(
        owner_account_id=owner_account_id,
        alias_vendor=alias_vendor,
        canonical_vendor=canonical_vendor,
    )
    db.add(dismissal)
    db.commit()
    db.refresh(dismissal)
    return dismissal
