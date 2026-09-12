"""Implements private listing draft, preview, publish, and unpublish endpoints.
These handlers only orchestrate guarded listing services.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.listings.schemas import (
    CreateListingRequest,
    ListingDraftResponse,
    ListingPreviewResponse,
    PublishChoicesInput,
    PublishRequest,
)
from app.core.identity import require_acting_account_id
from app.db.session import get_db
from app.models.listing import PublicListingRecord, ScopeVersion
from app.models.service_expense import ServiceExpense
from app.services.listings.create import build_scope_version, create_listing_draft
from app.services.listings.projection import build_payload_hash, build_public_listing
from app.services.listings.types import PublishChoices
from app.services.listings.visibility import publish_listing, unpublish_listing

router = APIRouter(prefix="/api/listings", tags=["listings"])


@router.post("", response_model=ListingDraftResponse)
def create_listing(
    request: Request,
    payload: CreateListingRequest,
    db: Session = Depends(get_db),
) -> ListingDraftResponse:
    """Create or update a scope-confirmed listing draft for one owner expense."""

    acting_account_id = require_acting_account_id(request)
    expense = _get_owner_expense(payload.expense_id, acting_account_id, db)
    if not expense.is_publishable:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Expense is not publishable")

    scope = build_scope_version(expense.id, payload.scope.model_dump(), db)
    listing = create_listing_draft(expense, scope, PublishChoices(**payload.choices.model_dump()), db)
    db.commit()
    db.refresh(listing)
    return ListingDraftResponse(
        listing_id=listing.id,
        expense_id=expense.id,
        scope_version_id=scope.id,
        visibility=listing.visibility,
    )


@router.get("/{listing_id}/preview", response_model=ListingPreviewResponse)
def preview_listing(
    listing_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> ListingPreviewResponse:
    """Return the exact public payload that publish will serve for this listing."""

    acting_account_id = require_acting_account_id(request)
    listing = _get_owner_listing(listing_id, acting_account_id, db)
    expense = _get_owner_expense(listing.expense_id, acting_account_id, db)
    scope = db.get(ScopeVersion, listing.scope_version_id)
    if scope is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scope version not found")

    projection = build_public_listing(listing, expense, scope, _choices_from_listing(listing))
    return ListingPreviewResponse(payload_hash=build_payload_hash(projection), projection=projection)


@router.post("/{listing_id}/publish", response_model=ListingPreviewResponse)
def publish_listing_route(
    listing_id: str,
    request: Request,
    payload: PublishRequest,
    db: Session = Depends(get_db),
) -> ListingPreviewResponse:
    """Publish a listing only when the owner confirms the preview hash."""

    acting_account_id = require_acting_account_id(request)
    listing = _get_owner_listing(listing_id, acting_account_id, db)
    projection = publish_listing(
        expense_id=listing.expense_id,
        scope_version_id=listing.scope_version_id,
        choices=_choices_from_listing(listing),
        previewed_payload_hash=payload.previewed_payload_hash,
        acting_account_id=acting_account_id,
        db=db,
    )
    return ListingPreviewResponse(payload_hash=build_payload_hash(projection), projection=projection)


@router.post("/{listing_id}/unpublish", response_model=ListingPreviewResponse)
def unpublish_listing_route(
    listing_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> ListingPreviewResponse:
    """Unpublish a listing immediately and return the resulting private state."""

    acting_account_id = require_acting_account_id(request)
    projection = unpublish_listing(listing_id, acting_account_id, db)
    return ListingPreviewResponse(payload_hash=build_payload_hash(projection), projection=projection)


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


def _get_owner_listing(listing_id: str, acting_account_id: str, db: Session) -> PublicListingRecord:
    listing = db.scalar(
        select(PublicListingRecord).where(
            PublicListingRecord.id == listing_id,
            PublicListingRecord.owner_account_id == acting_account_id,
        )
    )
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    return listing


def _choices_from_listing(listing: PublicListingRecord) -> PublishChoices:
    return PublishChoices(
        bidding_mode=listing.bidding_mode,
        show_incumbent_vendor=listing.show_incumbent_vendor,
        show_exact_address=listing.show_exact_address,
    )
