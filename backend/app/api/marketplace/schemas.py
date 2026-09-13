"""Response schemas for the public marketplace listing feed."""

from pydantic import BaseModel

from app.services.flybrain import BrainStimulus, FlyBrainAttribution
from app.services.listings.types import PublicListingProjection


class MarketplaceListingResponse(BaseModel):
    """Represents one public listing row in the marketplace feed."""

    listing: PublicListingProjection
    challenge_count: int


class MarketplaceFeedResponse(BaseModel):
    """Wraps marketplace feed rows with an optional empty-state message."""

    listings: list[MarketplaceListingResponse]
    message: str | None = None


class SimilarListingResponse(BaseModel):
    """One public listing with similar scope, and the scope terms both listings share."""

    listing: PublicListingProjection
    challenge_count: int
    scope_similarity: float
    shared_terms: list[str]


class SimilarListingsResponse(BaseModel):
    """Similar public listings plus the fly-brain circuit that retrieved them."""

    listings: list[SimilarListingResponse]
    message: str | None = None
    fly_brain: list[FlyBrainAttribution]
    # The public scope codes FlyHash compared, replayed by the live brain panel; built from public projections only.
    brain_stimulus: BrainStimulus | None = None
