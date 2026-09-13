"""Builds the row that keeps an owner's not-publishable mark when its charges regroup under a key with no row and none has posted.
Sync builds no baseline without a posted charge; this row holds only the mark and that no-posted-charges state.
"""

from app.core.visibility import ListingVisibility
from app.models.service_expense import ServiceExpense
from app.models.transaction import Transaction
from app.services.expenses.corrections.owner_eligibility import classify_owner_eligibility
from app.services.expenses.corrections.owner_overrides import OwnerOverrides


def build_unposted_marked_expense(
    owner_account_id: str,
    vendor_key: str,
    category: str | None,
    vendor_transactions: list[Transaction],
) -> ServiceExpense:
    """Return a new, unsaved, marked expense row for a group with transactions but no posted charge.

    Assumes vendor_transactions is one non-empty group (so one currency) that inherited the owner's
    mark from the row a rename moved it out of. Without this row the mark would be deleted along with
    that orphaned row before any charge posts. It matches an existing row in the same state: no amount
    or periods, reason "no_posted_debits", never publishable. With no posted charge to date it, its
    first and last seen span the group's own transactions. The next sync with a posted charge updates
    it like any existing row and keeps the mark.
    """

    overrides = OwnerOverrides(marked_ineligible=True)
    eligibility = classify_owner_eligibility(vendor_key, category, overrides, has_posted_charges=False)
    dates = [transaction.posted_at for transaction in vendor_transactions]
    return ServiceExpense(
        owner_account_id=owner_account_id,
        normalized_vendor=vendor_key,
        category=category,
        # Sync's value for a group too short to show a cadence.
        cadence="irregular",
        recurrence_confidence=0.0,
        amount_minor_per_period=0,
        currency=vendor_transactions[0].currency,
        annualized_amount_minor=0,
        first_seen=min(dates),
        last_seen=max(dates),
        period_count=0,
        is_eligible=eligibility.eligible,
        eligibility_reason=eligibility.reason,
        is_publishable=eligibility.publishable,
        visibility=ListingVisibility.private.value,
        owner_marked_ineligible=overrides.marked_ineligible,
    )
