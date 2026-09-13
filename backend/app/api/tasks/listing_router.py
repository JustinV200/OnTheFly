"""Task listing endpoints: confirm scope, exact preview, publish and unpublish, for every task origin."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.tasks.schemas import PublishTaskRequest, TaskPreviewResponse
from app.core.identity import require_acting_account_id
from app.core.task_lifecycle import TaskOrigin
from app.db.session import get_db
from app.services.listings.projection import build_payload_hash
from app.services.listings.visibility import unpublish_listing
from app.services.tasks.access import get_participant_task, listing_for_task, require_task_poster
from app.services.tasks.listing.any_origin import preview_any, publish_any
from app.services.tasks.listing.publish import confirm_task_scope
from app.services.tasks.scope.types import TaskPublishChoices

router = APIRouter(tags=["tasks"])


@router.post("/api/tasks/{task_id}/confirm", response_model=TaskPreviewResponse)
def confirm_scope(task_id: str, choices: TaskPublishChoices, request: Request, db: Session = Depends(get_db)) -> TaskPreviewResponse:
    """Confirm a new task's or piece's scope and disclosure choices; the listing stays private until published.

    A REBID confirms scope through POST /api/tasks/rebid, which records the owner's current price as well.
    """

    account_id = require_acting_account_id(request)
    task, _ = get_participant_task(task_id, account_id, db)
    if task.origin == TaskOrigin.rebid.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Confirm a REBID's scope from its REBID form")
    projection = confirm_task_scope(task, choices, account_id, db)
    return TaskPreviewResponse(payload_hash=build_payload_hash(projection), projection=projection)


@router.get("/api/tasks/{task_id}/preview", response_model=TaskPreviewResponse)
def preview(task_id: str, request: Request, db: Session = Depends(get_db)) -> TaskPreviewResponse:
    """Return the exact public payload publishing would serve."""

    account_id = require_acting_account_id(request)
    task, _ = get_participant_task(task_id, account_id, db)
    projection, payload_hash = preview_any(task, account_id, db)
    return TaskPreviewResponse(payload_hash=payload_hash, projection=projection)


@router.post("/api/tasks/{task_id}/publish", response_model=TaskPreviewResponse)
def publish(task_id: str, payload: PublishTaskRequest, request: Request, db: Session = Depends(get_db)) -> TaskPreviewResponse:
    """Publish only when the poster confirms the hash of the payload it previewed."""

    account_id = require_acting_account_id(request)
    task, _ = get_participant_task(task_id, account_id, db)
    projection = publish_any(task, payload.previewed_payload_hash, account_id, db)
    return TaskPreviewResponse(payload_hash=build_payload_hash(projection), projection=projection)


@router.post("/api/tasks/{task_id}/unpublish", response_model=TaskPreviewResponse)
def unpublish(task_id: str, request: Request, db: Session = Depends(get_db)) -> TaskPreviewResponse:
    """Return the task's listing to private at once; offers already received are kept."""

    account_id = require_acting_account_id(request)
    task, _ = get_participant_task(task_id, account_id, db)
    require_task_poster(task, account_id, "unpublishing")
    listing = listing_for_task(task.id, db)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task listing not found")
    projection = unpublish_listing(listing.id, account_id, db)
    return TaskPreviewResponse(payload_hash=build_payload_hash(projection), projection=projection)
