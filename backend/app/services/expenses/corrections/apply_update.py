"""Applies one owner correction to an expense: vendor, category, and the not-publishable mark.
It writes correction rules and the row's owner fields and commits; it never publishes and never lifts a hard exclusion.
"""

from sqlalchemy.orm import Session

from app.models.service_expense import ServiceExpense
from app.services.expenses.corrections.descriptor_rules import upsert_descriptor_corrections
from app.services.expenses.corrections.errors import ExpenseCorrectionError
from app.services.expenses.corrections.owner_eligibility import classify_owner_eligibility
from app.services.expenses.corrections.owner_overrides import OwnerOverrides
from app.services.expenses.corrections.update_request import OwnerExpenseUpdate


def apply_owner_expense_update(expense: ServiceExpense, update: OwnerExpenseUpdate, db: Session) -> None:
    """Apply the fields the owner sent to one of their expenses, recompute its eligibility, and commit.

    Assumes the caller already checked the expense belongs to the acting owner. Unsent fields keep
    their stored values, so a later request never wipes an earlier correction. is_publishable true
    clears the owner's mark only when classification allows publishing; otherwise this raises
    ExpenseCorrectionError before anything is written. A vendor or category correction is written as
    descriptor rules too, so it survives every re-sync; a sent null clears only the row's value.
    The stored group key is left for sync, which regroups a renamed vendor on the next dashboard load.
    """

    stored = OwnerOverrides.of(expense)
    corrected_vendor = (
        update.owner_corrected_vendor if update.is_sent("owner_corrected_vendor") else stored.corrected_vendor
    )
    corrected_category = (
        update.owner_corrected_category if update.is_sent("owner_corrected_category") else stored.corrected_category
    )

    # Classified without the mark and as if charges had posted: this is the hard-exclusion check
    # that decides whether the owner may clear the mark. It runs before any write.
    unmarked = OwnerOverrides(corrected_vendor, corrected_category, marked_ineligible=False)
    if update.is_publishable is True and not classify_owner_eligibility(
        expense.normalized_vendor, expense.category, unmarked
    ).publishable:
        raise ExpenseCorrectionError("Hard exclusions cannot be made publishable")
    marked_ineligible = stored.marked_ineligible if update.is_publishable is None else not update.is_publishable

    upsert_descriptor_corrections(expense, update.owner_corrected_vendor, update.owner_corrected_category, db)

    overrides = OwnerOverrides(corrected_vendor, corrected_category, marked_ineligible)
    # period_count is zero only in sync's no-posted-charges state, so the response matches the next sync.
    eligibility = classify_owner_eligibility(
        expense.normalized_vendor,
        expense.category,
        overrides,
        has_posted_charges=expense.period_count > 0,
    )
    expense.owner_corrected_vendor = overrides.corrected_vendor
    expense.owner_corrected_category = overrides.corrected_category
    expense.owner_marked_ineligible = overrides.marked_ineligible
    expense.is_eligible = eligibility.eligible
    expense.eligibility_reason = eligibility.reason
    expense.is_publishable = eligibility.publishable
    db.commit()
