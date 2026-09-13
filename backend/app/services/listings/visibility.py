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
from app.services.listings.audit import write_visibility_audit
from app.services.listings.projection import build_payload_hash, build_public_listing
from app.services.listings.types import PublishChoices, PublicListingProjection



def publish_listing(
    expense_id: str,
    scope_version_id: str,
    choices: PublishChoices,
    previewed_payload_hash: str,
    acting_account_id: str,
    db: Session,
) -> PublicListingProjection:
    """Publish a scope-confirmed listing after verifying the preview payload hash."""

    expense = _get_owner_expense(expense_id, acting_account_id, db)
    listing = _get_listing_for_expense(expense_id, acting_account_id, db)
    scope = _get_scope(scope_version_id, expense.id, db)

    if not expense.is_publishable:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Expense is not publishable")
    if listing.visibility != ListingVisibility.scope_confirmed.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Listing is not scope confirmed")

    projection = build_public_listing(listing, expense, scope, choices)
    if build_payload_hash(projection) != previewed_payload_hash:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Preview payload hash mismatch")

    previous_state = listing.visibility
    published_at = datetime.now(timezone.utc)
    listing.visibility = ListingVisibility.public.value
    listing.published_at = published_at
    expense.visibility = ListingVisibility.public.value
    projection.visibility = ListingVisibility.public.value
    projection.published_at = published_at
    write_visibility_audit(expense.id, acting_account_id, previous_state, listing.visibility, projection.model_dump_json(), db)
    _persist_projection(listing, projection)
    db.commit()
    db.refresh(listing)
    return projection



def unpublish_listing(listing_id: str, acting_account_id: str, db: Session) -> PublicListingProjection:
    """Return a listing to private immediately while retaining its stored record."""

    listing = db.scalar(
        select(PublicListingRecord).where(
            PublicListingRecord.id == listing_id,
            PublicListingRecord.owner_account_id == acting_account_id,
        )
    )
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    expense = _get_owner_expense(listing.expense_id, acting_account_id, db)
    previous_state = listing.visibility
    projection = PublicListingProjection(
        id=listing.id,
        expense_id=listing.expense_id,
        category=listing.category,
        scope_summary=listing.scope_summary,
        price_minor=listing.price_minor,
        price_currency=listing.price_currency,
        billing_cadence=listing.billing_cadence,
        service_area_approximate=listing.service_area_approximate,
        bidding_mode=listing.bidding_mode,
        challenge_deadline=listing.challenge_deadline,
        incumbent_vendor_name=listing.incumbent_vendor_name,
        show_exact_address=listing.show_exact_address,
        visibility=ListingVisibility.private.value,
        published_at=listing.published_at,
    )

    listing.visibility = ListingVisibility.private.value
    expense.visibility = ListingVisibility.private.value
    write_visibility_audit(expense.id, acting_account_id, previous_state, listing.visibility, projection.model_dump_json(), db)
    db.commit()
    return projection



def _persist_projection(listing: PublicListingRecord, projection: PublicListingProjection) -> None:
    listing.category = projection.category
    listing.scope_summary = projection.scope_summary
    listing.price_minor = projection.price_minor
    listing.price_currency = projection.price_currency
    listing.billing_cadence = projection.billing_cadence
    listing.service_area_approximate = projection.service_area_approximate
    listing.bidding_mode = projection.bidding_mode
    listing.challenge_deadline = projection.challenge_deadline
    listing.incumbent_vendor_name = projection.incumbent_vendor_name
    listing.show_exact_address = projection.show_exact_address
    listing.visibility = projection.visibility
    listing.published_at = projection.published_at


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
