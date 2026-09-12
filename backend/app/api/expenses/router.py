"""Implements private dashboard endpoints for grouped service expenses.
Handlers stay thin and delegate grouping logic to expense services.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.expenses.schemas import (
    ExpenseDetailResponse,
    ExpenseListResponse,
    ExpenseResponse,
    ExpenseUpdateRequest,
    ImportRequest,
    ImportResultResponse,
    TransactionResponse,
)
from app.core.identity import require_acting_account_id
from app.db.session import get_db
from app.models.service_expense import ServiceExpense
from app.models.transaction import Transaction
from app.services.expenses.eligibility import classify_eligibility
from app.services.expenses.sync import sync_service_expenses
from app.services.expenses.vendor_normalize import VendorCorrectionStore
from app.services.transactions.import_run import run_import

router = APIRouter(prefix="/api/expenses", tags=["expenses"])


@router.post("/import", response_model=ImportResultResponse, status_code=202)
def trigger_import(
    payload: ImportRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> ImportResultResponse:
    """Run the import pipeline for the acting account and return counts.

    The provider_account_id must match the acting account's connected financial
    account. For the fixture source this is the seeded demo account ID.
    This endpoint is synchronous for simplicity at MVP scale.
    """

    account_id = require_acting_account_id(request)
    result = run_import(account_id, payload.provider_account_id, db)
    return ImportResultResponse(
        new=result.new,
        duplicate=result.duplicate,
        excluded=result.excluded,
        failed=result.failed,
    )



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
    return ExpenseListResponse(expenses=[_serialize_expense(expense) for expense in expenses])


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
    payload = _serialize_expense(expense).model_dump()
    payload["supporting_transactions"] = [
        TransactionResponse(
            id=transaction.id,
            raw_description=transaction.raw_description,
            normalized_vendor=transaction.normalized_vendor,
            amount_minor=transaction.amount_minor,
            currency=transaction.currency,
            posted_at=transaction.posted_at,
            source_type=transaction.source_type,
            is_excluded=transaction.is_excluded,
            excluded_reason=transaction.excluded_reason,
        )
        for transaction in transactions
    ]
    return ExpenseDetailResponse(**payload)


@router.patch("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: str,
    update: ExpenseUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> ExpenseResponse:
    """Persist owner corrections without allowing hard exclusions to become publishable."""

    account_id = require_acting_account_id(request)
    expense = _get_owner_expense(expense_id, account_id, db)
    correction_store = VendorCorrectionStore()

    if update.owner_corrected_vendor or update.owner_corrected_category:
        correction_store.upsert(
            owner_account_id=account_id,
            raw_description_pattern=expense.normalized_vendor,
            corrected_vendor=update.owner_corrected_vendor,
            corrected_category=update.owner_corrected_category,
            db=db,
        )

    display_vendor = update.owner_corrected_vendor or expense.owner_corrected_vendor or expense.normalized_vendor
    category = update.owner_corrected_category or expense.owner_corrected_category or expense.category
    eligibility = classify_eligibility(display_vendor, category, "debit")

    expense.owner_corrected_vendor = update.owner_corrected_vendor
    expense.owner_corrected_category = update.owner_corrected_category
    expense.category = category
    expense.is_eligible = eligibility.eligible
    expense.eligibility_reason = eligibility.reason
    expense.is_publishable = eligibility.publishable

    if update.is_publishable is False and expense.is_publishable:
        expense.is_publishable = False
        expense.is_eligible = False
        expense.eligibility_reason = "owner_marked_ineligible"
    elif update.is_publishable is True and not eligibility.publishable:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hard exclusions cannot be made publishable",
        )

    db.commit()
    db.refresh(expense)
    return _serialize_expense(expense)


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


def _serialize_expense(expense: ServiceExpense) -> ExpenseResponse:
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
        visibility=expense.visibility,
        is_eligible=expense.is_eligible,
        eligibility_reason=expense.eligibility_reason,
        is_publishable=expense.is_publishable,
    )
