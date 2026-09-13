"""Drops constraint origins a client sent: only the splitting service may mark a constraint as flowed down."""

from app.services.scope.requirements import ConstraintInput
from app.services.tasks.scope.types import TaskScopeDraft


def owner_constraints(draft: TaskScopeDraft) -> TaskScopeDraft:
    """Return the draft with every constraint's inherited_from_task_id cleared.

    edit_task_scope restores the origin of a constraint the owner kept, so a piece's inherited constraints stay marked.
    """

    return draft.model_copy(
        update={"constraints": [ConstraintInput(kind=item.kind, value=item.value) for item in draft.constraints]}
    )
