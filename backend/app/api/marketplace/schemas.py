"""Response schemas for the public marketplace listing feed."""

from pydantic import BaseModel

from app.services.listings.types import PublicListingProjection


class MarketplaceListingResponse(BaseModel):
    """Represents one public listing row in the marketplace feed."""

    listing: PublicListingProjection
    challenge_count: int


class MarketplaceFeedResponse(BaseModel):
    """Wraps marketplace feed rows with an optional empty-state message."""

    listings: list[MarketplaceListingResponse]
    message: str | None = None
