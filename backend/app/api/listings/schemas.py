"""Request and response schemas for private listing-management endpoints."""

from datetime import datetime

from pydantic import BaseModel

from app.services.listings.types import PublicListingProjection


class ScopeVersionInput(BaseModel):
    """Captures owner-confirmed scope details before a listing is published."""

    service_area: str | None = None
    location_approximate: str | None = None
    square_footage: int | None = None
    visit_frequency: str | None = None
    bathroom_count: int | None = None
    required_tasks: str | None = None
    supplies_included: bool | None = None
    equipment_included: bool | None = None
    taxes_included: bool | None = None
    insurance_required: str | None = None
    start_date: str | None = None
    minimum_term: str | None = None
    cancellation_terms: str | None = None
    current_price_minor: int | None = None
    current_price_currency: str = "USD"
    billing_cadence: str | None = None
    challenge_deadline: datetime | None = None
    incumbent_vendor_name: str | None = None


class PublishChoicesInput(BaseModel):
    """Captures owner disclosure choices for a listing preview and publish."""

    bidding_mode: str = "sealed"
    show_incumbent_vendor: bool = False
    show_exact_address: bool = False


class CreateListingRequest(BaseModel):
    """Captures the owner payload used to confirm scope and create a draft."""

    expense_id: str
    scope: ScopeVersionInput
    choices: PublishChoicesInput


class ListingDraftResponse(BaseModel):
    """Returns the created draft listing and its active scope version id."""

    listing_id: str
    expense_id: str
    scope_version_id: str
    visibility: str


class ListingPreviewResponse(BaseModel):
    """Returns the exact public projection and the hash to publish it."""

    payload_hash: str
    projection: PublicListingProjection


class PublishRequest(BaseModel):
    """Captures the preview hash confirmation required to publish safely."""

    previewed_payload_hash: str


class BiddingModeRequest(BaseModel):
    """Captures the new bidding mode for an owner-controlled listing toggle."""

    mode: str  # "sealed" | "open"


class BiddingModeResponse(BaseModel):
    """Returns the listing's active bidding mode after a toggle."""

    listing_id: str
    bidding_mode: str
