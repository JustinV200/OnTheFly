"""Moves a new task or a piece through scope confirmed → exact preview → public (roadmap 12, steps 3 and 6).
Only the poster acts, nothing publishes without the preview hash, and every visibility change is audited.
"""

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.cadence import is_regular_cadence
from app.core.visibility import ListingVisibility
from app.models.listing import PublicListingRecord, ScopeVersion
from app.models.tasks import Task
from app.services.listings.audit import write_visibility_audit
from app.services.listings.projection import build_payload_hash, persist_projection
from app.services.listings.types import PublicListingProjection
from app.services.scope.public_content import build_public_scope_content
from app.services.tasks.access import listing_for_task, require_task_poster
from app.services.tasks.listing.projection import build_task_listing_projection
from app.services.tasks.listing.subcontract import is_subcontract
from app.services.tasks.scope.types import TaskPublishChoices
from app.services.tasks.state_sync import sync_task_state


def confirm_task_scope(task: Task, choices: TaskPublishChoices, acting_account_id: str, db: Session) -> PublicListingProjection:
    """Confirm the task's current scope and disclosure choices; the listing becomes scope confirmed, still private."""

    listing, scope = _poster_listing(task, acting_account_id, "confirming scope", db)
    _ensure_not_accepted(task)
    if listing.visibility == ListingVisibility.public.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This listing is public. Unpublish it before confirming a changed scope, then preview and publish again.",
        )
    if not is_regular_cadence(scope.billing_cadence):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The task needs a regular billing period")

    previous_state = listing.visibility
    listing.visibility = ListingVisibility.scope_confirmed.value
    listing.bidding_mode = choices.bidding_mode
    listing.show_price = choices.show_price
    projection = build_task_projection(listing, task, scope, db)
    persist_projection(listing, projection)
    sync_task_state(task, listing.visibility)
    write_visibility_audit(None, acting_account_id, previous_state, listing.visibility, projection.model_dump_json(), db, task.id)
    db.commit()
    return projection


def preview_task_listing(task: Task, acting_account_id: str, db: Session) -> tuple[PublicListingProjection, str]:
    """Return the exact payload publishing would serve, and its hash."""

    listing, scope = _poster_listing(task, acting_account_id, "previewing", db)
    projection = build_task_projection(listing, task, scope, db)
    return projection, build_payload_hash(projection)


def publish_task_listing(task: Task, previewed_payload_hash: str, acting_account_id: str, db: Session) -> PublicListingProjection:
    """Publish a scope-confirmed new task or piece when the owner confirms the exact preview hash."""

    listing, scope = _poster_listing(task, acting_account_id, "publishing", db)
    _ensure_not_accepted(task)
    if listing.visibility != ListingVisibility.scope_confirmed.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Confirm the scope before publishing")

    projection = build_task_projection(listing, task, scope, db)
    if build_payload_hash(projection) != previewed_payload_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Preview payload hash mismatch: the listing changed since you previewed it. Preview again.",
        )

    previous_state = listing.visibility
    published_at = datetime.now(timezone.utc)
    listing.visibility = ListingVisibility.public.value
    listing.published_at = published_at
    projection.visibility = listing.visibility
    projection.published_at = published_at
    persist_projection(listing, projection)
    sync_task_state(task, listing.visibility)
    write_visibility_audit(None, acting_account_id, previous_state, listing.visibility, projection.model_dump_json(), db, task.id)
    db.commit()
    return projection


def build_task_projection(listing: PublicListingRecord, task: Task, scope: ScopeVersion, db: Session) -> PublicListingProjection:
    """Build the projection from the listing's stored choices and the task's own scope version."""

    content = build_public_scope_content(scope, task.category, task.title, db)
    choices = TaskPublishChoices(
        bidding_mode="open" if listing.bidding_mode == "open" else "sealed",
        show_price=bool(listing.show_price),
    )
    return build_task_listing_projection(listing, task, scope, content, choices, is_subcontract(task, db))


def _poster_listing(task: Task, acting_account_id: str, action: str, db: Session) -> tuple[PublicListingRecord, ScopeVersion]:
    require_task_poster(task, acting_account_id, action)
    listing = listing_for_task(task.id, db)
    scope = db.get(ScopeVersion, listing.scope_version_id) if listing is not None else None
    if listing is None or scope is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task listing not found")
    return listing, scope


def _ensure_not_accepted(task: Task) -> None:
    if task.accepted_challenge_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This task already accepted an offer; its listing is closed.",
        )
