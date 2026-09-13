"""Keeps a task's lifecycle state in step with its listing's visibility.
Acceptance is the one state only services/tasks/acceptance.py sets; nothing here can move a task out of it.
"""

from app.core.task_lifecycle import TaskState
from app.models.tasks import Task


def sync_task_state(task: Task | None, listing_visibility: str) -> None:
    """Mirror the listing's visibility onto the task; an accepted task stays accepted, an unknown value reads private."""

    if task is None or task.state == TaskState.accepted.value:
        return
    try:
        task.state = TaskState(listing_visibility).value
    except ValueError:
        task.state = TaskState.private.value
