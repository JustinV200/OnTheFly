"""Serves the owner-only spend-signals report for one grouped expense.
The handler checks ownership and delegates all analysis to the expenses service.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.identity import require_acting_account_id
from app.db.session import get_db
from app.models.service_expense import ServiceExpense
from app.services.expenses.spend_signals import SpendSignalsReport, build_spend_signals

router = APIRouter(prefix="/api/spend-signals", tags=["spend-signals"])


@router.get("/{expense_id}", response_model=SpendSignalsReport)
def get_spend_signals(
    expense_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> SpendSignalsReport:
    """Return price levels, the baseline explanation, and charge flags for an owned expense.

    Private data: a non-owner gets 404, the same as a missing expense, so the
    response never confirms that another account's expense exists.
    """

    account_id = require_acting_account_id(request)
    expense = db.scalar(
        select(ServiceExpense).where(
            ServiceExpense.id == expense_id,
            ServiceExpense.owner_account_id == account_id,
        )
    )
    if expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    try:
        return build_spend_signals(expense, db)
    except ValueError as error:
        # A stored expense with no transactions is stale (it predates a regroup), not empty.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
