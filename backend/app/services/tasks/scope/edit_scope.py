"""Writes a changed scope for a new task or a piece: a new version, never an edit of the one offers answered.
A public listing must be unpublished first; editing never publishes anything and never touches a piece's cut.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.task_lifecycle import TaskOrigin
from app.core.visibility import ListingVisibility
from app.models.listing import ScopeVersion
from app.models.scope import ScopeConstraint
from app.models.tasks import Task
from app.services.listings.projection import persist_projection
from app.services.scope.requirements import ConstraintInput, load_constraints
from app.services.tasks.access import listing_for_task, require_task_poster
from app.services.tasks.events import write_task_event
from app.services.tasks.listing.publish import build_task_projection
from app.services.tasks.scope.parent_scope_flags import flag_pieces_after_parent_change
from app.services.tasks.scope.types import TaskScopeDraft
from app.services.tasks.scope.write_version import ScopeVersionContent, validate_category_fields, write_task_scope_version
from app.services.tasks.state_sync import sync_task_state


def edit_task_scope(task: Task, draft: TaskScopeDraft, acting_account_id: str, db: Session) -> ScopeVersion:
    """Write the task's next scope version from the draft; the listing returns to private until confirmed again.

    A piece keeps its cut as its price whatever the draft says: cuts only change through the split ledger.
    Removing a constraint that flowed down from the parent is allowed, audited, and reported in the event.
    """

    require_task_poster(task, acting_account_id, "editing scope")
    if task.origin == TaskOrigin.rebid.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Edit a rebid's scope from its REBID flow")
    if task.accepted_challenge_id is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This task already accepted an offer")
    listing = listing_for_task(task.id, db)
    current = db.get(ScopeVersion, listing.scope_version_id) if listing is not None else None
    if listing is None or current is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task listing not found")
    if listing.visibility == ListingVisibility.public.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unpublish this listing before changing its scope; offers already received are kept.",
        )

    constraints = _keep_inheritance(load_constraints(current.id, db), draft.constraints)
    removed = _removed_inherited(load_constraints(current.id, db), constraints)
    scope = write_task_scope_version(
        task,
        ScopeVersionContent(
            requirements=draft.requirements,
            constraints=constraints,
            # A piece's price is its cut; a new task's is the owner's budget.
            price_minor=current.current_price_minor if task.origin == TaskOrigin.split.value else draft.price_minor,
            category_fields_json=validate_category_fields(task.category, draft.category_fields),
            service_area=draft.service_area,
            challenge_deadline=draft.challenge_deadline,
        ),
        db,
    )
    task.title = draft.title
    listing.scope_version_id = scope.id
    listing.visibility = ListingVisibility.private.value
    persist_projection(listing, build_task_projection(listing, task, scope, db))
    sync_task_state(task, listing.visibility)
    for constraint in removed:
        write_task_event(
            task.id,
            acting_account_id,
            "constraint_removed",
            {"kind": constraint.kind, "value": constraint.value, "warning": "Bidders are no longer told to meet it"},
            db,
        )
    flag_pieces_after_parent_change(task, db)
    db.commit()
    return scope


def _keep_inheritance(previous: list[ScopeConstraint], submitted: list[ConstraintInput]) -> list[ConstraintInput]:
    # The API never accepts inherited_from_task_id from a client; a constraint the owner kept keeps its origin.
    origins = {(row.kind, row.value): row.inherited_from_task_id for row in previous if row.inherited_from_task_id}
    return [
        ConstraintInput(kind=item.kind, value=item.value, inherited_from_task_id=origins.get((item.kind, item.value)))
        for item in submitted
    ]


def _removed_inherited(previous: list[ScopeConstraint], kept: list[ConstraintInput]) -> list[ScopeConstraint]:
    kept_pairs = {(item.kind, item.value) for item in kept}
    return [row for row in previous if row.inherited_from_task_id and (row.kind, row.value) not in kept_pairs]
