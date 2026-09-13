"""Applies guarded visibility transitions for listing publication.
All transitions are explicit here so private-by-default stays enforceable.
"""

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.visibility import ListingVisibility
from app.models.listing import PublicListingRecord, ScopeVersion
from app.models.service_expense import ServiceExpense
from app.models.tasks import Task
from app.services.listings.audit import write_visibility_audit
from app.services.listings.create import load_rebid_content
from app.services.listings.projection import (
    build_payload_hash,
    build_public_listing,
    persist_projection,
    projection_from_record,
)
from app.services.listings.types import PublishChoices, PublicListingProjection
from app.services.tasks.state_sync import sync_task_state



def publish_listing(
    expense_id: str,
    scope_version_id: str,
    choices: PublishChoices,
    previewed_payload_hash: str,
    acting_account_id: str,
    db: Session,
) -> PublicListingProjection:
    """Publish a scope-confirmed rebid listing after verifying the preview payload hash."""

    expense = _get_owner_expense(expense_id, acting_account_id, db)
    listing = _get_listing_for_expense(expense_id, acting_account_id, db)
    scope = _get_scope(scope_version_id, expense.id, db)
    task = db.get(Task, listing.task_id) if listing.task_id else None

    if not expense.is_publishable:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Expense is not publishable")
    if listing.visibility != ListingVisibility.scope_confirmed.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Listing is not scope confirmed")

    content = load_rebid_content(scope, expense, task.title if task else None, db)
    projection = build_public_listing(listing, expense, scope, choices, content)
    if build_payload_hash(projection) != previewed_payload_hash:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Preview payload hash mismatch")

    previous_state = listing.visibility
    published_at = datetime.now(timezone.utc)
    listing.visibility = ListingVisibility.public.value
    listing.published_at = published_at
    expense.visibility = ListingVisibility.public.value
    projection.visibility = ListingVisibility.public.value
    projection.published_at = published_at
    write_visibility_audit(
        expense.id, acting_account_id, previous_state, listing.visibility, projection.model_dump_json(), db, listing.task_id
    )
    persist_projection(listing, projection)
    sync_task_state(task, listing.visibility)
    db.commit()
    db.refresh(listing)
    return projection



def unpublish_listing(listing_id: str, acting_account_id: str, db: Session) -> PublicListingProjection:
    """Return a listing to private immediately while retaining its stored record and its offers.

    Works for every task origin: a rebid also returns its expense to private; a new task or piece has no expense.
    An accepted listing is already out of public view and stays accepted.
    """

    listing = db.scalar(
        select(PublicListingRecord).where(
            PublicListingRecord.id == listing_id,
            PublicListingRecord.owner_account_id == acting_account_id,
        )
    )
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.visibility == ListingVisibility.accepted.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This listing accepted an offer, so it is already out of public view and can't be unpublished.",
        )

    expense = _get_owner_expense(listing.expense_id, acting_account_id, db) if listing.expense_id else None
    task = db.get(Task, listing.task_id) if listing.task_id else None
    previous_state = listing.visibility
    # The stored record is the payload that was served; only its visibility changes.
    projection = projection_from_record(listing)
    projection.visibility = ListingVisibility.private.value

    listing.visibility = ListingVisibility.private.value
    if expense is not None:
        expense.visibility = ListingVisibility.private.value
    sync_task_state(task, listing.visibility)
    write_visibility_audit(
        listing.expense_id, acting_account_id, previous_state, listing.visibility, projection.model_dump_json(), db, listing.task_id
    )
    db.commit()
    return projection


def _get_listing_for_expense(
    expense_id: str,
    acting_account_id: str,
    db: Session,
) -> PublicListingRecord:
    listing = db.scalar(
        select(PublicListingRecord).where(
            PublicListingRecord.expense_id == expense_id,
            PublicListingRecord.owner_account_id == acting_account_id,
        )
    )
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    return listing


def _get_owner_expense(expense_id: str, acting_account_id: str, db: Session) -> ServiceExpense:
    expense = db.scalar(
        select(ServiceExpense).where(
            ServiceExpense.id == expense_id,
            ServiceExpense.owner_account_id == acting_account_id,
        )
    )
    if expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    return expense


def _get_scope(scope_version_id: str, expense_id: str, db: Session) -> ScopeVersion:
    scope = db.scalar(
        select(ScopeVersion).where(
            ScopeVersion.id == scope_version_id,
            ScopeVersion.expense_id == expense_id,
        )
    )
    if scope is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scope version not found")
    return scope
