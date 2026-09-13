"""Pairs an owner's expenses with the REBID tasks it opened on them, so the private Spend view can link straight to a task
and say where it stands (accepted, say) instead of offering actions that no longer apply.
Owner-scoped: only tasks the acting account posted are read, so another business's task never attaches to an expense.
"""

from typing import NamedTuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.task_lifecycle import TaskOrigin
from app.models.tasks import Task


class ExpenseTask(NamedTuple):
    """The REBID task on one expense: its id and lifecycle state."""

    task_id: str
    state: str


def rebid_tasks_by_expense(account_id: str, db: Session) -> dict[str, ExpenseTask]:
    """Return {expense_id: ExpenseTask} for the account's REBID tasks; the newest task wins if an expense has several."""

    rows = db.execute(
        select(Task.expense_id, Task.id, Task.state)
        .where(
            Task.posted_by_account_id == account_id,
            Task.origin == TaskOrigin.rebid.value,
            Task.expense_id.is_not(None),
        )
        # Oldest first, so a later task for the same expense overwrites an earlier one in the dict below.
        .order_by(Task.created_at.asc())
    ).all()
    return {row.expense_id: ExpenseTask(task_id=row.id, state=row.state) for row in rows}
