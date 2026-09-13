"""Serves the public marketplace feed from persisted public listing records only.
This router never queries private expense models to build browsing results.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.marketplace.schemas import (
    MarketplaceFeedResponse,
    MarketplaceListingResponse,
    SimilarListingResponse,
    SimilarListingsResponse,
)
from app.core.identity import get_acting_account_id
from app.core.visibility import ListingVisibility
from app.db.session import get_db
from app.models.challenge import Challenge
from app.models.listing import PublicListingRecord
from app.services.flybrain import FlyBrainComponent, attribute
from app.services.listings.projection import projection_from_record
from app.services.marketplace import find_similar_listings, similar_listings_stimulus

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])

# Listings published before the projection's missing-category fallback became "cleaning"
# were stored as "commercial_cleaning". Both keys name the same category, so the filter
# matches either one and those stored rows stay findable without a data migration.
_CATEGORY_KEY_GROUPS: tuple[frozenset[str], ...] = (
    frozenset({"cleaning", "commercial_cleaning"}),
)


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
        query = query.where(PublicListingRecord.category.in_(_matching_category_keys(category)))
    if service_area:
        query = query.where(PublicListingRecord.service_area_approximate.contains(service_area))
    if acting_account_id:
        query = query.where(PublicListingRecord.owner_account_id != acting_account_id)

    records = db.scalars(query.order_by(PublicListingRecord.created_at.desc())).all()
    counts_by_listing = _active_challenge_counts([record.id for record in records], db)

    listings = [
        MarketplaceListingResponse(
            listing=projection_from_record(record),
            challenge_count=counts_by_listing.get(record.id, 0),
        )
        for record in records
    ]
    if not listings:
        return MarketplaceFeedResponse(
            listings=[],
            message="No public listings in this category yet",
        )
    return MarketplaceFeedResponse(listings=listings)


@router.get("/{listing_id}", response_model=MarketplaceListingResponse)
def get_listing_detail(
    listing_id: str,
    db: Session = Depends(get_db),
) -> MarketplaceListingResponse:
    """Return one public listing by ID; accessible without an acting account."""

    record = db.scalar(
        select(PublicListingRecord).where(
            PublicListingRecord.id == listing_id,
            PublicListingRecord.visibility == ListingVisibility.public.value,
        )
    )
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    return MarketplaceListingResponse(
        listing=projection_from_record(record),
        challenge_count=_active_challenge_counts([listing_id], db).get(listing_id, 0),
    )


@router.get("/{listing_id}/similar", response_model=SimilarListingsResponse)
def get_similar_listings(
    listing_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> SimilarListingsResponse:
    """Return public listings whose scope resembles this public listing's scope.

    Public like the detail page; the viewer's own listings are left out when the
    acting account is known.
    """

    similar = find_similar_listings(listing_id, get_acting_account_id(request), db)
    if similar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    counts_by_listing = _active_challenge_counts([item.projection.id for item in similar.listings], db)
    return SimilarListingsResponse(
        listings=[
            SimilarListingResponse(
                listing=item.projection,
                challenge_count=counts_by_listing.get(item.projection.id, 0),
                scope_similarity=item.similarity,
                shared_terms=item.shared_terms,
            )
            for item in similar.listings
        ],
        message=None if similar.listings else "No other public listings with similar scope yet",
        fly_brain=[
            attribute(
                FlyBrainComponent.mushroom_body_flyhash,
                "Found listings with similar scope from public listing fields only; price is not used to match.",
            )
        ],
        brain_stimulus=similar_listings_stimulus(similar),
    )


def _matching_category_keys(category: str) -> list[str]:
    # A key outside every alias group matches only itself, exactly as before.
    for group in _CATEGORY_KEY_GROUPS:
        if category in group:
            return sorted(group)
    return [category]


def _active_challenge_counts(listing_ids: list[str], db: Session) -> dict[str, int]:
    # One aggregated query for every listing on the page, to avoid N+1 count queries.
    if not listing_ids:
        return {}
    rows = db.execute(
        select(Challenge.listing_id, func.count().label("cnt"))
        .where(Challenge.listing_id.in_(listing_ids))
        .where(Challenge.is_active.is_(True))
        .group_by(Challenge.listing_id)
    ).all()
    return {row.listing_id: int(row.cnt) for row in rows}
