"""Task endpoints: read a task, post new work, confirm a REBID's scope, read and edit scope, and relationships.
Handlers parse input, call a service and shape the response; every rule lives in services/tasks.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.tasks.acceptance_router import router as acceptance_router
from app.api.tasks.listing_router import router as listing_router
from app.api.tasks.owner_constraints import owner_constraints
from app.api.tasks.schemas import ListingRelationshipResponse, RebidRequest
from app.core.identity import require_acting_account_id
from app.db.session import get_db
from app.models.listing import PublicListingRecord
from app.models.service_expense import ServiceExpense
from app.models.tasks import Task
from app.services.listings.types import PublishChoices
from app.services.tasks.access import get_participant_task, require_task_poster
from app.services.tasks.events import write_task_event
from app.services.tasks.scope.create_new import create_new_task
from app.services.tasks.scope.current_draft import EditableScopeDraft, current_scope_draft
from app.services.tasks.scope.edit_scope import edit_task_scope
from app.services.tasks.scope.rebid_scope import confirm_rebid_scope
from app.services.tasks.scope.types import TaskScopeDraft
from app.services.tasks.views import TaskDetail, build_task_detail

router = APIRouter(tags=["tasks"])
# Publishing and acceptance live in their own modules; including them here keeps api/router.py's wiring to one line.
router.include_router(listing_router)
router.include_router(acceptance_router)


@router.get("/api/tasks/{task_id}", response_model=TaskDetail)
def get_task(task_id: str, request: Request, db: Session = Depends(get_db)) -> TaskDetail:
    """Return the task as its poster or owner sees it."""

    return build_task_detail(task_id, require_acting_account_id(request), db)


@router.post("/api/tasks", response_model=TaskDetail)
def create_task(draft: TaskScopeDraft, request: Request, db: Session = Depends(get_db)) -> TaskDetail:
    """Post new work as a private task with scope version 1; nothing is public until previewed and published."""

    account_id = require_acting_account_id(request)
    task = create_new_task(account_id, owner_constraints(draft), db)
    return build_task_detail(task.id, account_id, db)


@router.post("/api/tasks/rebid", response_model=TaskDetail)
def rebid_expense(payload: RebidRequest, request: Request, db: Session = Depends(get_db)) -> TaskDetail:
    """Confirm a REBID's requirement rows for one of the acting account's expenses; the listing becomes scope confirmed."""

    account_id = require_acting_account_id(request)
    expense = db.scalar(
        select(ServiceExpense).where(ServiceExpense.id == payload.expense_id, ServiceExpense.owner_account_id == account_id)
    )
    if expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    _, _, task = confirm_rebid_scope(
        expense, owner_constraints(payload.draft), PublishChoices(**payload.choices.model_dump()), db
    )
    return build_task_detail(task.id, account_id, db)


@router.get("/api/tasks/{task_id}/scope-draft", response_model=EditableScopeDraft)
def get_scope_draft(task_id: str, request: Request, db: Session = Depends(get_db)) -> EditableScopeDraft:
    """Return the task's current scope as a draft for its poster to edit; nothing changes until the edit is saved."""

    account_id = require_acting_account_id(request)
    task, _ = get_participant_task(task_id, account_id, db)
    require_task_poster(task, account_id, "editing scope")
    draft = current_scope_draft(task, db)
    if draft is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task listing not found")
    return draft


@router.put("/api/tasks/{task_id}/scope", response_model=TaskDetail)
def edit_scope(task_id: str, draft: TaskScopeDraft, request: Request, db: Session = Depends(get_db)) -> TaskDetail:
    """Write a new scope version for a new task or piece; its listing returns to private until confirmed again."""

    account_id = require_acting_account_id(request)
    task, _ = get_participant_task(task_id, account_id, db)
    edit_task_scope(task, owner_constraints(draft), account_id, db)
    return build_task_detail(task.id, account_id, db)


@router.post("/api/tasks/{task_id}/parent-scope-reviewed", response_model=TaskDetail)
def mark_parent_scope_reviewed(task_id: str, request: Request, db: Session = Depends(get_db)) -> TaskDetail:
    """Clear "parent scope changed, review" once the piece's poster has looked; the piece itself is unchanged."""

    account_id = require_acting_account_id(request)
    task, _ = get_participant_task(task_id, account_id, db)
    require_task_poster(task, account_id, "reviewing a parent scope change")
    if task.parent_scope_changed_at is not None:
        write_task_event(
            task.id,
            account_id,
            "parent_scope_reviewed",
            {"flagged_at": task.parent_scope_changed_at.astimezone(timezone.utc).isoformat()},
            db,
        )
        task.parent_scope_changed_at = None
        task.updated_at = datetime.now(timezone.utc)
        db.commit()
    return build_task_detail(task.id, account_id, db)


@router.get("/api/listings/{listing_id}/relationship", response_model=ListingRelationshipResponse)
def listing_relationship(listing_id: str, request: Request, db: Session = Depends(get_db)) -> ListingRelationshipResponse:
    """Say whether the acting account posted this listing. The public projection deliberately never names its poster."""

    account_id = require_acting_account_id(request)
    listing = db.get(PublicListingRecord, listing_id)
    if listing is None or listing.owner_account_id != account_id:
        return ListingRelationshipResponse(is_poster=False, task_id=None)
    task = db.get(Task, listing.task_id) if listing.task_id else None
    return ListingRelationshipResponse(is_poster=True, task_id=task.id if task is not None else None)
