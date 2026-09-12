"""Runs idempotent transaction imports from the configured source.
It deduplicates source records and marks excluded spend without publishing anything.
"""

import re

from datetime import date, timedelta

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.services.expenses.sync import sync_service_expenses
from app.services.transactions.factory import get_transaction_source
from app.services.transactions.source import NormalizedTransaction


class ImportResult(BaseModel):
    """Summarizes how one import run changed local transaction storage."""

    new: int
    duplicate: int
    excluded: int
    failed: int



def run_import(owner_account_id: str, provider_account_id: str, db: Session) -> ImportResult:
    """Import, deduplicate, classify, and persist transactions for one owner account."""

    source = get_transaction_source()
    window_end = date.today()
    window_start = window_end - timedelta(days=730)
    counts = ImportResult(new=0, duplicate=0, excluded=0, failed=0)

    for transaction in source.list_transactions(provider_account_id, window_start, window_end):
        if _find_duplicate(db, transaction) is not None:
            counts.duplicate += 1
            continue

        excluded_reason = _classify_exclusion(transaction)
        try:
            record = Transaction(
                owner_account_id=owner_account_id,
                provider=transaction.provider,
                provider_account_id=transaction.provider_account_id,
                provider_transaction_id=transaction.provider_transaction_id,
                source_type=transaction.source_type,
                raw_description=transaction.raw_description,
                normalized_vendor=transaction.normalized_vendor,
                amount_minor=transaction.amount_minor,
                currency=transaction.currency,
                direction=transaction.direction,
                posted_at=transaction.posted_at,
                status=transaction.status,
                category=transaction.category,
                memo=transaction.memo,
                counterparty=transaction.counterparty,
                raw_payload=transaction.raw_payload,
                is_excluded=excluded_reason is not None,
                excluded_reason=excluded_reason,
            )
            db.add(record)
            counts.new += 1
            if excluded_reason is not None:
                counts.excluded += 1
        except Exception:  # noqa: BLE001
            counts.failed += 1

    db.commit()
    sync_service_expenses(owner_account_id, db)
    return counts


def _find_duplicate(db: Session, transaction: NormalizedTransaction) -> Transaction | None:
    query = select(Transaction).where(
        Transaction.provider == transaction.provider,
        Transaction.provider_account_id == transaction.provider_account_id,
        Transaction.provider_transaction_id == transaction.provider_transaction_id,
    )
    return db.scalar(query)


def _classify_exclusion(transaction: NormalizedTransaction) -> str | None:
    haystack = " ".join(
        value.lower()
        for value in [transaction.raw_description, transaction.category or "", transaction.memo or ""]
    )
    if "payroll" in haystack:
        return "payroll"
    # Exclude only credits that are also identified as transfers.  A debit transaction
    # whose vendor name contains "transfer" (e.g. "Transfer Pro Cleaning") is legitimate
    # spend and must not be excluded — checking direction prevents false positives.
    if transaction.direction == "credit" and "transfer" in haystack:
        return "transfer"
    # Use a whole-word match to avoid false-positives on vendor names that contain
    # "tax" as a substring (e.g. "Syntaxco", "Exacta Supplies").
    if re.search(r"\btax\b", haystack):
        return "tax"
    return None
