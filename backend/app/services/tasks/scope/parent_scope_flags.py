"""Flags a task's active pieces "parent scope changed, review" when the parent gets a new scope version.
Pieces are never rewritten, and their offers stay attached to the versions they answered (plan2, "Flow-down").
"""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.tasks import Task, TaskSplit


def flag_pieces_after_parent_change(parent: Task, db: Session, except_child_task_id: str | None = None) -> int:
    """Set parent_scope_changed_at on every active piece of the parent and return how many were flagged.

    except_child_task_id skips the piece whose own split wrote the new parent version: it is not a change to review.
    """

    splits = db.scalars(
        select(TaskSplit).where(TaskSplit.parent_task_id == parent.id, TaskSplit.undone_at.is_(None))
    ).all()
    flagged = 0
    now = datetime.now(timezone.utc)
    for split in splits:
        if split.child_task_id == except_child_task_id:
            continue
        child = db.get(Task, split.child_task_id)
        if child is not None:
            child.parent_scope_changed_at = now
            flagged += 1
    return flagged
