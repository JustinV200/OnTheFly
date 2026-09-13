"""Counts a task's active suggested pieces, the number the per-task suggestion cap applies to (roadmap question 4)."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.task_lifecycle import SplitEntryPoint
from app.models.tasks import TaskSplit


def active_suggested_pieces(task_id: str, db: Session) -> int:
    """Return how many active pieces were split off this task from Ways to save; manual splits never count."""

    return int(
        db.scalar(
            select(func.count())
            .select_from(TaskSplit)
            .where(
                TaskSplit.parent_task_id == task_id,
                TaskSplit.undone_at.is_(None),
                TaskSplit.entry_point == SplitEntryPoint.suggested.value,
            )
        )
        or 0
    )
