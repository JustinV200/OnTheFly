"""Pairs an owner's expenses with the REBID tasks it opened on them, so the private Spend view can link straight to a task.
Owner-scoped: only tasks the acting account posted are read, so another business's task never attaches to an expense.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.task_lifecycle import TaskOrigin
from app.models.tasks import Task


def rebid_task_ids_by_expense(account_id: str, db: Session) -> dict[str, str]:
    """Return {expense_id: task_id} for the account's REBID tasks; the newest task wins if an expense has several."""

    rows = db.execute(
        select(Task.expense_id, Task.id)
        .where(
            Task.posted_by_account_id == account_id,
            Task.origin == TaskOrigin.rebid.value,
            Task.expense_id.is_not(None),
        )
        # Oldest first, so a later task for the same expense overwrites an earlier one in the dict below.
        .order_by(Task.created_at.asc())
    ).all()
    return {row.expense_id: row.id for row in rows}
