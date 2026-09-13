"""Adds, lists and removes an account's own cost basis rates. Every read and write is scoped to the acting account.
A change to rates marks that account's Ways to save cards stale, since they were priced with the old rates.
"""

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.savings import CostBasisRate, SavingsCard
from app.models.tasks import Task
from app.services.rates.types import RateInput, RateProvenance


def list_rates(account_id: str, db: Session) -> list[CostBasisRate]:
    """Return the account's rates, account-wide first, then by labor category and newest effective date."""

    return list(
        db.scalars(
            select(CostBasisRate)
            .where(CostBasisRate.account_id == account_id)
            .order_by(CostBasisRate.task_id.is_not(None), CostBasisRate.labor_category, CostBasisRate.effective_date.desc())
        ).all()
    )


def add_rate(account_id: str, rate: RateInput, provenance: RateProvenance, db: Session) -> CostBasisRate:
    """Insert one rate for the account; a task-scoped rate must be on a task the account posted or owns."""

    if rate.task_id is not None:
        task = db.get(Task, rate.task_id)
        if task is None or account_id not in {task.posted_by_account_id, task.owner_account_id}:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    row = CostBasisRate(
        account_id=account_id,
        task_id=rate.task_id,
        kind=rate.kind.value,
        labor_category=rate.labor_category,
        rate_minor_per_hour=rate.rate_minor_per_hour,
        currency=rate.currency,
        effective_date=rate.effective_date,
        provenance=provenance.value,
    )
    db.add(row)
    mark_cards_stale(account_id, db)
    db.commit()
    db.refresh(row)
    return row


def delete_rate(account_id: str, rate_id: str, db: Session) -> None:
    """Delete one of the account's rates; another account's rate id reads as not found."""

    row = db.get(CostBasisRate, rate_id)
    if row is None or row.account_id != account_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rate not found")
    db.delete(row)
    mark_cards_stale(account_id, db)
    db.commit()


def mark_cards_stale(account_id: str, db: Session) -> None:
    """Mark the account's suggested and dismissed cards stale; split cards keep the record of what was split."""

    db.execute(
        update(SavingsCard)
        .where(SavingsCard.account_id == account_id, SavingsCard.status.in_(["suggested", "dismissed"]))
        .values(status="stale")
    )
