"""Finds the cost basis rate that prices a labor category for one owner on one task.
Keep cost uses the owner's own rates only: never another account's, never public rates, never offers.
"""

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.savings import CostBasisRate
from app.models.tasks import Task
from app.services.rates.types import RateKind


def rate_kind_for(task: Task, account_id: str) -> RateKind:
    """Return which rate kind prices the task for this owner.

    A buyer that still owns what it posted pays a contract today, so its contract rates are its keep cost. An owner
    that won the task by bidding does the work itself, so its internal loaded cost is.
    """

    if task.accepted_challenge_id is None and task.posted_by_account_id == account_id:
        return RateKind.current_contract_rate
    return RateKind.internal_cost


def find_rate(task: Task, account_id: str, labor_category: str, currency: str, db: Session, today: date | None = None) -> CostBasisRate | None:
    """Return the latest rate in effect for the category: one scoped to this task wins over an account-wide one.

    Only rates in the task's currency match; a rate in another currency is not converted (CLAUDE.md, money).
    """

    kind = rate_kind_for(task, account_id)
    on_or_before = today or date.today()
    candidates = db.scalars(
        select(CostBasisRate)
        .where(
            CostBasisRate.account_id == account_id,
            CostBasisRate.kind == kind.value,
            CostBasisRate.labor_category == labor_category,
            CostBasisRate.currency == currency,
            CostBasisRate.effective_date <= on_or_before,
            (CostBasisRate.task_id == task.id) | (CostBasisRate.task_id.is_(None)),
        )
        .order_by(CostBasisRate.effective_date.desc(), CostBasisRate.created_at.desc())
    ).all()
    task_scoped = [rate for rate in candidates if rate.task_id == task.id]
    return (task_scoped or list(candidates) or [None])[0]
