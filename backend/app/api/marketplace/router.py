"""Serves the public marketplace feed from persisted public listing records only.
This router never queries private expense models to build browsing results.
"""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.marketplace.schemas import MarketplaceFeedResponse, MarketplaceListingResponse
from app.core.identity import get_acting_account_id
from app.core.visibility import ListingVisibility
from app.db.session import get_db
from app.models.challenge import Challenge
from app.models.listing import PublicListingRecord
from app.services.listings.projection import projection_from_record

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])


@router.get("", response_model=MarketplaceFeedResponse)
def list_marketplace(
    request: Request,
    category: str | None = Query(default=None),
    service_area: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> MarketplaceFeedResponse:
    """Return public listings, optionally filtered, with own listings excluded when known."""

    acting_account_id = get_acting_account_id(request)
    query = select(PublicListingRecord).where(
        PublicListingRecord.visibility == ListingVisibility.public.value
    )
    if category:
        query = query.where(PublicListingRecord.category == category)
    if service_area:
        query = query.where(PublicListingRecord.service_area_approximate.contains(service_area))
    if acting_account_id:
        query = query.where(PublicListingRecord.owner_account_id != acting_account_id)

    records = db.scalars(query.order_by(PublicListingRecord.created_at.desc())).all()
    listings = [
        MarketplaceListingResponse(
            listing=projection_from_record(record),
            challenge_count=int(
                db.scalar(
                    select(func.count()).select_from(Challenge).where(
                        Challenge.listing_id == record.id,
                        Challenge.is_active.is_(True),
                    )
                )
                or 0
            ),
        )
        for record in records
    ]
    if not listings:
        return MarketplaceFeedResponse(
            listings=[],
            message="No public listings in this category yet",
        )
    return MarketplaceFeedResponse(listings=listings)
