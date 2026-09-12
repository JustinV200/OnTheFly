"""Serves public business profiles composed only from public listing records.
This router never serializes private expense models directly.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.profiles.schemas import ProfileResponse
from app.core.visibility import ListingVisibility
from app.db.session import get_db
from app.models.account import Account
from app.models.listing import PublicListingRecord
from app.services.listings.projection import projection_from_record

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


@router.get("/{handle}", response_model=ProfileResponse)
def get_profile(handle: str, db: Session = Depends(get_db)) -> ProfileResponse:
    """Return a public profile with public listings only and no auth requirement."""

    account = db.scalar(select(Account).where(Account.handle == handle))
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    listings = db.scalars(
        select(PublicListingRecord)
        .where(PublicListingRecord.owner_account_id == account.id)
        .where(PublicListingRecord.visibility == ListingVisibility.public.value)
        .order_by(PublicListingRecord.created_at.desc())
    ).all()
    return ProfileResponse(
        handle=account.handle,
        business_name=account.business_name,
        service_area=account.service_area,
        listings=[projection_from_record(listing) for listing in listings],
    )
