"""Previews and publishes a task's listing whatever its origin, so the task page has one flow.
A rebid goes through the expense publish services unchanged; a new task or piece through its own projection builder.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.task_lifecycle import TaskOrigin
from app.models.listing import PublicListingRecord, ScopeVersion
from app.models.service_expense import ServiceExpense
from app.models.tasks import Task
from app.services.listings.create import load_rebid_content
from app.services.listings.projection import build_payload_hash, build_public_listing
from app.services.listings.types import PublicListingProjection, PublishChoices
from app.services.listings.visibility import publish_listing
from app.services.tasks.access import listing_for_task, require_task_poster
from app.services.tasks.listing.publish import preview_task_listing, publish_task_listing


def preview_any(task: Task, account_id: str, db: Session) -> tuple[PublicListingProjection, str]:
    """Return the exact payload publishing would serve and its hash."""

    if task.origin != TaskOrigin.rebid.value:
        return preview_task_listing(task, account_id, db)
    listing, expense, scope = _rebid_parts(task, account_id, db)
    projection = build_public_listing(
        listing, expense, scope, _rebid_choices(listing), load_rebid_content(scope, expense, task.title, db)
    )
    return projection, build_payload_hash(projection)


def publish_any(task: Task, previewed_payload_hash: str, account_id: str, db: Session) -> PublicListingProjection:
    """Publish the task's listing when the poster confirms the exact preview hash."""

    if task.origin != TaskOrigin.rebid.value:
        return publish_task_listing(task, previewed_payload_hash, account_id, db)
    if task.accepted_challenge_id is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This task already accepted an offer.")
    listing, expense, scope = _rebid_parts(task, account_id, db)
    return publish_listing(expense.id, scope.id, _rebid_choices(listing), previewed_payload_hash, account_id, db)


def _rebid_parts(task: Task, account_id: str, db: Session) -> tuple[PublicListingRecord, ServiceExpense, ScopeVersion]:
    require_task_poster(task, account_id, "publishing")
    listing = listing_for_task(task.id, db)
    expense = db.get(ServiceExpense, task.expense_id) if task.expense_id else None
    scope = db.get(ScopeVersion, listing.scope_version_id) if listing is not None else None
    if listing is None or expense is None or scope is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Confirm this REBID's scope first")
    return listing, expense, scope


def _rebid_choices(listing: PublicListingRecord) -> PublishChoices:
    return PublishChoices(
        bidding_mode=listing.bidding_mode,
        show_incumbent_vendor=listing.show_incumbent_vendor,
        show_exact_address=listing.show_exact_address,
    )
