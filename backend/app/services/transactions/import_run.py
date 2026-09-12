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
from app.services.transactions.source import NormalizedTransaction, TransactionSource
from app.models.financial_connection import FinancialConnection
from app.services.transactions.stripe.client import StripeError


class ImportResult(BaseModel):
    """Summarizes how one import run changed local transaction storage."""

    new: int
    duplicate: int
    excluded: int
    failed: int



def run_import(owner_account_id: str, provider_account_id: str, db: Session,
               source: TransactionSource | None = None) -> ImportResult:
    """Import, deduplicate, classify, and persist transactions for one owner account."""

    source = source or get_transaction_source()
    if provider_account_id.startswith("fca_"):
        connection = db.get(FinancialConnection, owner_account_id)
        if connection is None or connection.bank_account_id != provider_account_id:
            raise StripeError("Bank account does not belong to this company.")
    window_end = date.today()
    window_start = window_end - timedelta(days=730)
    counts = ImportResult(new=0, duplicate=0, excluded=0, failed=0)

    for transaction in source.list_transactions(provider_account_id, window_start, window_end):
        existing = _find_duplicate(db, transaction)
        if existing is not None:
            if existing.owner_account_id != owner_account_id:
                raise StripeError("Transaction belongs to another company.")
            if transaction.provider == "stripe":
                # Retain identity while applying status and amount corrections.
                for field, value in transaction.model_dump().items():
                    if field != "normalized_vendor":
                        setattr(existing, field, value)
                reason = _classify_exclusion(transaction)
                existing.is_excluded = reason is not None
                existing.excluded_reason = reason
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
    if transaction.provider == "stripe" and transaction.status != "posted":
        return transaction.status
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
