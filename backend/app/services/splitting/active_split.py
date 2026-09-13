"""States whether a piece's split is still active. Undoing a split returns the piece's cut and requirements to its
parent, so the closed piece has nothing of its own left: it can't be confirmed, published, accepted or split further
(roadmap 12, "Undoing a split"). Tasks that aren't pieces always pass.
"""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.task_lifecycle import TaskOrigin
from app.models.tasks import Task, TaskSplit


def is_undone_piece(task: Task, db: Session) -> bool:
    """Return True only for a split-origin task whose split record has been undone."""

    if task.origin != TaskOrigin.split.value:
        return False
    active = db.scalar(select(TaskSplit.id).where(TaskSplit.child_task_id == task.id, TaskSplit.undone_at.is_(None)))
    return active is None


def ensure_split_active(task: Task, db: Session, action: str) -> None:
    """Raise 400 naming the refused action when the task is a piece whose split was undone."""

    if is_undone_piece(task, db):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This piece's split was undone, so it can't be {action}. Split a new piece off its task instead.",
        )
