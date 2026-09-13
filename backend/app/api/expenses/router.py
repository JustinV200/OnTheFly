"""Implements private dashboard endpoints for grouped service expenses.
Handlers stay thin and delegate grouping logic to expense services. Imports live in api/connection.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.expenses.schemas import (
    ExpenseDetailResponse,
    ExpenseListResponse,
    ExpenseResponse,
    ExpenseUpdateRequest,
    TransactionResponse,
)
from app.core.identity import require_acting_account_id
from app.db.session import get_db
from app.models.listing import PublicListingRecord
from app.models.service_expense import ServiceExpense
from app.models.transaction import Transaction
from app.services.expenses.corrections import ExpenseCorrectionError, OwnerExpenseUpdate, apply_owner_expense_update
from app.services.expenses.sync import sync_service_expenses
from app.services.tasks.expense_tasks import rebid_task_ids_by_expense

router = APIRouter(prefix="/api/expenses", tags=["expenses"])


@router.get("", response_model=ExpenseListResponse)
def list_expenses(request: Request, db: Session = Depends(get_db)) -> ExpenseListResponse:
    """Return all grouped expenses for the acting account, synced from transactions."""

    account_id = require_acting_account_id(request)
    transactions_exist = db.scalar(
        select(Transaction.id).where(Transaction.owner_account_id == account_id).limit(1)
    )
    if transactions_exist is None:
        return ExpenseListResponse(expenses=[], message="No transactions imported yet")

    sync_service_expenses(account_id, db)
    expenses = db.scalars(
        select(ServiceExpense)
        .where(ServiceExpense.owner_account_id == account_id)
        .order_by(ServiceExpense.annualized_amount_minor.desc())
    ).all()
    listing_ids = _listing_ids_by_expense(account_id, db)
    task_ids = rebid_task_ids_by_expense(account_id, db)
    provenance = _provenance_by_vendor(account_id, db)
    return ExpenseListResponse(
        expenses=[
            _serialize_expense(
                expense,
                listing_ids.get(expense.id),
                task_ids.get(expense.id),
                provenance.get(expense.normalized_vendor, []),
            )
            for expense in expenses
        ]
    )


@router.get("/{expense_id}", response_model=ExpenseDetailResponse)
def get_expense_detail(
    expense_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> ExpenseDetailResponse:
    """Return one grouped expense and its supporting private transactions."""

    account_id = require_acting_account_id(request)
    expense = _get_owner_expense(expense_id, account_id, db)
    transactions = db.scalars(
        select(Transaction)
        .where(Transaction.owner_account_id == account_id)
        .where(Transaction.normalized_vendor == expense.normalized_vendor)
        .order_by(Transaction.posted_at.desc())
    ).all()
    row = _serialize_expense(
        expense,
        _listing_ids_by_expense(account_id, db).get(expense.id),
        rebid_task_ids_by_expense(account_id, db).get(expense.id),
        sorted({transaction.source_type for transaction in transactions}),
    )
    return ExpenseDetailResponse(
        **row.model_dump(),
        supporting_transactions=[
            TransactionResponse(
                id=transaction.id,
                raw_description=transaction.raw_description,
                normalized_vendor=transaction.normalized_vendor,
                amount_minor=transaction.amount_minor,
                currency=transaction.currency,
                posted_at=transaction.posted_at,
                status=transaction.status,
                direction=transaction.direction,
                source_type=transaction.source_type,
                is_excluded=transaction.is_excluded,
                excluded_reason=transaction.excluded_reason,
            )
            for transaction in transactions
        ],
    )


@router.patch("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: str,
    update: ExpenseUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> ExpenseResponse:
    """Persist owner corrections without allowing hard exclusions to become publishable.

    Only fields present in the body change, so a later request never wipes an earlier correction.
    """

    account_id = require_acting_account_id(request)
    expense = _get_owner_expense(expense_id, account_id, db)
    # exclude_unset keeps "not sent" distinct from an explicit null, which clears a correction.
    correction = OwnerExpenseUpdate.model_validate(update.model_dump(exclude_unset=True))
    try:
        apply_owner_expense_update(expense, correction, db)
    except ExpenseCorrectionError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

    db.refresh(expense)
    provenance = _provenance_by_vendor(account_id, db).get(expense.normalized_vendor, [])
    return _serialize_expense(
        expense,
        _listing_ids_by_expense(account_id, db).get(expense.id),
        rebid_task_ids_by_expense(account_id, db).get(expense.id),
        provenance,
    )


def _get_owner_expense(expense_id: str, account_id: str, db: Session) -> ServiceExpense:
    expense = db.scalar(
        select(ServiceExpense).where(
            ServiceExpense.id == expense_id,
            ServiceExpense.owner_account_id == account_id,
        )
    )
    if expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    return expense


def _listing_ids_by_expense(account_id: str, db: Session) -> dict[str, str]:
    # One query for the whole dashboard; listings are owner-scoped so no other business's leak in.
    rows = db.execute(
        select(PublicListingRecord.expense_id, PublicListingRecord.id).where(
            PublicListingRecord.owner_account_id == account_id
        )
    ).all()
    return {row.expense_id: row.id for row in rows}


def _provenance_by_vendor(account_id: str, db: Session) -> dict[str, list[str]]:
    # Grouping is by normalized vendor (the same key expense detail uses to find its transactions).
    rows = db.execute(
        select(Transaction.normalized_vendor, Transaction.source_type)
        .where(Transaction.owner_account_id == account_id)
        .distinct()
    ).all()
    by_vendor: dict[str, set[str]] = {}
    for row in rows:
        by_vendor.setdefault(row.normalized_vendor or "", set()).add(row.source_type)
    return {vendor: sorted(sources) for vendor, sources in by_vendor.items()}


def _serialize_expense(expense: ServiceExpense, listing_id: str | None, task_id: str | None, provenance: list[str]) -> ExpenseResponse:
    return ExpenseResponse(
        id=expense.id,
        vendor=expense.owner_corrected_vendor or expense.normalized_vendor,
        category=expense.owner_corrected_category or expense.category,
        cadence=expense.cadence,
        recurrence_confidence=expense.recurrence_confidence,
        amount_minor_per_period=expense.amount_minor_per_period,
        currency=expense.currency,
        annualized_amount_minor=expense.annualized_amount_minor,
        period_count=expense.period_count,
        first_seen=expense.first_seen,
        last_seen=expense.last_seen,
        visibility=expense.visibility,
        is_eligible=expense.is_eligible,
        eligibility_reason=expense.eligibility_reason,
        is_publishable=expense.is_publishable,
        listing_id=listing_id,
        task_id=task_id,
        provenance=provenance,
    )
