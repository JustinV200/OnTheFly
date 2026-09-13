"""Reads a task's current scope back as an editable draft, so the edit form starts from what the poster confirmed
instead of a blank page. Read only: saving still goes through the REBID confirm or edit-scope services.
"""

import json

from pydantic import Field
from sqlalchemy.orm import Session

from app.models.listing import ScopeVersion
from app.models.tasks import Task
from app.services.scope.requirements import (
    ConstraintInput,
    RequirementInput,
    load_constraints,
    load_requirements,
    requirement_to_input,
)
from app.services.tasks.access import listing_for_task
from app.services.tasks.scope.types import TaskScopeDraft


class EditableScopeDraft(TaskScopeDraft):
    """The draft shape as read back. Unlike a submitted draft it may be incomplete: a listing backfilled into a rebid
    task by migration 0013 has no title or requirement rows yet, and the poster fills them in before saving."""

    title: str = Field(default="", max_length=255)
    requirements: list[RequirementInput] = Field(default_factory=list)


def current_scope_draft(task: Task, db: Session) -> EditableScopeDraft | None:
    """Return the listing's current scope version as a draft, or None when the task has no listing yet.

    Assumes the caller checked the account posted the task. Requirement keys are kept, so saving the draft carries
    each unchanged row over as the same requirement. Constraint origins are left out: edit_task_scope restores them.
    """

    listing = listing_for_task(task.id, db)
    scope = db.get(ScopeVersion, listing.scope_version_id) if listing is not None else None
    if scope is None:
        return None
    return EditableScopeDraft(
        title=task.title or "",
        category=task.category,
        service_area=scope.service_area or scope.location_approximate,
        # A stored price of zero or less was never a confirmed price, so it reads back as unanswered.
        price_minor=scope.current_price_minor if scope.current_price_minor and scope.current_price_minor > 0 else None,
        currency=task.currency,
        billing_period=task.billing_period,  # type: ignore[arg-type]  # a task's period was validated when it was created
        challenge_deadline=scope.challenge_deadline,
        category_fields=json.loads(scope.category_fields) if scope.category_fields else None,
        requirements=[requirement_to_input(row) for row in load_requirements(scope.id, db)],
        constraints=[
            ConstraintInput(kind=row.kind, value=row.value)  # type: ignore[arg-type]  # stored kinds were validated on the way in
            for row in load_constraints(scope.id, db)
        ],
        incumbent_vendor_name=scope.incumbent_vendor_name,
    )
