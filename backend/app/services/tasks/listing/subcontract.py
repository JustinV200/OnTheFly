"""Decides whether a task is labeled Subcontract: a piece split off a task its splitter owned through an acceptance.
Pieces a buyer splits before accepting an offer are ordinary listings (plan2, "Subcontract label").
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.task_lifecycle import TaskOrigin
from app.models.tasks import Task, TaskSplit


def is_subcontract(task: Task, db: Session) -> bool:
    """Return True when the task is a piece whose split happened after its parent accepted an offer."""

    if task.origin != TaskOrigin.split.value:
        return False
    split = db.scalar(select(TaskSplit).where(TaskSplit.child_task_id == task.id))
    return split is not None and not split.split_before_acceptance
