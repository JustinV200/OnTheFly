"""Response schemas for public business profiles and public listings."""

from pydantic import BaseModel

from app.services.listings.types import PublicListingProjection


class ProfileResponse(BaseModel):
    """Represents one public business profile and its visible listings."""

    handle: str
    business_name: str
    service_area: str
    listings: list[PublicListingProjection]
