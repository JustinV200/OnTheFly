"""Builds and upserts dashboard service-expense rows from imported transactions.
The grouped view stays private and owner-scoped until later publish phases.
"""

from collections import Counter, defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.visibility import ListingVisibility
from app.models.service_expense import ServiceExpense
from app.models.transaction import Transaction
from app.services.expenses.baseline import compute_baseline
from app.services.expenses.eligibility import classify_eligibility
from app.services.expenses.listing_references import listed_expense_ids
from app.services.expenses.recurrence import detect_recurrence
from app.services.expenses.vendor_normalize import VendorCorrectionStore, normalize_vendor_description



def sync_service_expenses(owner_account_id: str, db: Session) -> list[ServiceExpense]:
    """Upsert grouped service expenses for one owner from imported transactions."""

    transactions = db.scalars(
        select(Transaction).where(Transaction.owner_account_id == owner_account_id)
    ).all()
    grouped = _group_transactions(owner_account_id, transactions, db)
    results: list[ServiceExpense] = []

    for vendor_key, vendor_transactions in grouped.items():
        recurrence = detect_recurrence(vendor_transactions)
        baseline = compute_baseline(vendor_transactions, recurrence)
        display_vendor = vendor_transactions[0].normalized_vendor or vendor_key
        category = _choose_category(vendor_transactions)
        eligibility = classify_eligibility(display_vendor, category, vendor_transactions[0].direction)
        existing = db.scalar(
            select(ServiceExpense).where(
                ServiceExpense.owner_account_id == owner_account_id,
                ServiceExpense.normalized_vendor == vendor_key,
            )
        )
        cadence = recurrence.cadence if recurrence.cadence != "insufficient_data" else "irregular"

        if existing is None:
            expense = ServiceExpense(
                owner_account_id=owner_account_id,
                normalized_vendor=vendor_key,
                category=category,
                cadence=cadence,
                recurrence_confidence=recurrence.confidence,
                amount_minor_per_period=baseline.amount_per_period.amount,
                currency=baseline.amount_per_period.currency,
                annualized_amount_minor=baseline.annualized_cost.amount,
                first_seen=recurrence.first_seen,
                last_seen=recurrence.last_seen,
                period_count=recurrence.period_count,
                is_eligible=eligibility.eligible,
                eligibility_reason=eligibility.reason,
                is_publishable=eligibility.publishable,
                visibility=ListingVisibility.private.value,
            )
            db.add(expense)
            results.append(expense)
            continue

        existing.category = category
        existing.cadence = cadence
        existing.recurrence_confidence = recurrence.confidence
        existing.amount_minor_per_period = baseline.amount_per_period.amount
        existing.currency = baseline.amount_per_period.currency
        existing.annualized_amount_minor = baseline.annualized_cost.amount
        existing.first_seen = recurrence.first_seen
        existing.last_seen = recurrence.last_seen
        existing.period_count = recurrence.period_count
        existing.is_eligible = eligibility.eligible
        existing.eligibility_reason = eligibility.reason
        existing.is_publishable = eligibility.publishable
        results.append(existing)

    _remove_orphaned_expenses(owner_account_id, set(grouped), db)
    db.commit()
    return results


def _remove_orphaned_expenses(owner_account_id: str, current_vendor_keys: set[str], db: Session) -> None:
    # A vendor rename or alias merge regroups transactions under a new key, which left
    # the old row on the dashboard as a stale duplicate. Rows no transaction groups
    # under any more are deleted, unless the listing flow references them: scope
    # versions, listings, and visibility audits must keep resolving to their expense.
    stored = db.scalars(select(ServiceExpense).where(ServiceExpense.owner_account_id == owner_account_id)).all()
    orphaned = [expense for expense in stored if expense.normalized_vendor not in current_vendor_keys]
    referenced = listed_expense_ids([expense.id for expense in orphaned], db)
    for expense in orphaned:
        if expense.id not in referenced:
            db.delete(expense)


def _group_transactions(
    owner_account_id: str,
    transactions: list[Transaction],
    db: Session,
) -> dict[str, list[Transaction]]:
    correction_store = VendorCorrectionStore()
    grouped: dict[str, list[Transaction]] = defaultdict(list)
    for transaction in transactions:
        fallback_vendor = transaction.normalized_vendor or normalize_vendor_description(
            transaction.raw_description
        )
        vendor, category = correction_store.resolve(
            owner_account_id=owner_account_id,
            raw_description=transaction.raw_description,
            fallback_vendor=fallback_vendor,
            fallback_category=transaction.category,
            db=db,
        )
        transaction.normalized_vendor = vendor
        transaction.category = category
        grouped[vendor].append(transaction)
    return dict(grouped)


def _choose_category(transactions: list[Transaction]) -> str | None:
    categories = [transaction.category for transaction in transactions if transaction.category]
    if not categories:
        return None
    return Counter(categories).most_common(1)[0][0]
