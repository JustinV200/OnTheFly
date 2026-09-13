"""Names what the difference between a listing's price and an offer means, by task origin (plan2, "Tasks and ownership").
A rebid compares against observed spend ("Potential savings"); a new task against a budget, never called savings;
a piece against the cut its owner set aside.
"""

from app.core.task_lifecycle import TaskOrigin
from app.models.tasks import Task

_LABELS: dict[str, str] = {
    TaskOrigin.rebid.value: "Potential savings",
    TaskOrigin.new.value: "Potentially under budget",
    TaskOrigin.split.value: "Potentially under your cut",
}


def savings_label_for(task: Task | None) -> str:
    """Return the comparison label for the task's origin; a listing without a task is a rebid from before tasks."""

    if task is None:
        return _LABELS[TaskOrigin.rebid.value]
    return _LABELS.get(task.origin, _LABELS[TaskOrigin.rebid.value])
