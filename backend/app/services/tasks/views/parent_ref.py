"""Names the task a piece was split from, for the one audience allowed to know it: an account that posted or owns that parent.
A bidder that won the piece is neither, so it gets nothing, which keeps "each account sees only its direct counterparties"
(CLAUDE.md, "Task ownership and splitting"). This is a private participant view; public piece projections never use it.
"""

from sqlalchemy.orm import Session

from app.models.tasks import Task
from app.services.tasks.views.types import ParentTaskRef


def visible_parent(task: Task, account_id: str, db: Session) -> ParentTaskRef | None:
    """Return the parent task's id and title when the viewer posted or owns the parent; otherwise None."""

    if task.parent_task_id is None:
        return None
    parent = db.get(Task, task.parent_task_id)
    # Posting the parent counts even after it was accepted: a buyer's own pre-acceptance piece still links back to it.
    if parent is None or account_id not in (parent.posted_by_account_id, parent.owner_account_id):
        return None
    return ParentTaskRef(task_id=parent.id, title=parent.title)
