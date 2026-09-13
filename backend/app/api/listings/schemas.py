"""Request and response schemas for private listing-management endpoints."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.services.listings.types import PublicListingProjection


class ScopeVersionInput(BaseModel):
    """Captures owner-confirmed scope details before a listing is published."""

    service_area: str | None = None
    location_approximate: str | None = None
    square_footage: int | None = None
    visit_frequency: str | None = None
    bathroom_count: int | None = None
    # A list at the boundary; stored as a JSON array string that scope completeness parses back.
    required_tasks: list[str] | None = None
    supplies_included: bool | None = None
    equipment_included: bool | None = None
    taxes_included: bool | None = None
    insurance_required: str | None = None
    start_date: str | None = None
    minimum_term: str | None = None
    cancellation_terms: str | None = None
    # Unstated stays None; a stated price must be positive, since savings are this baseline
    # minus each offer and a zero or negative baseline would misstate every comparison.
    current_price_minor: int | None = Field(default=None, gt=0)
    current_price_currency: str = "USD"
    billing_cadence: str | None = None
    challenge_deadline: datetime | None = None
    incumbent_vendor_name: str | None = None

    @field_validator("required_tasks")
    @classmethod
    def _tasks_are_named(cls, value: list[str] | None) -> list[str] | None:
        # Tasks are published verbatim and every one is scored, so a blank entry would become an
        # unnamed requirement no challenger could see or meet. Surrounding spaces carry no meaning.
        if value is None:
            return None
        return [task.strip() for task in value if task.strip()]

    @field_validator("current_price_currency")
    @classmethod
    def _currency_is_a_code(cls, value: str) -> str:
        # With a stated price, this code becomes the listing's currency and so every offer's. Money
        # compares codes exactly, so "usd" and "USD" must not both reach the database.
        code = value.strip().upper()
        if len(code) != 3 or not code.isascii() or not code.isalpha():
            raise ValueError("current_price_currency must be a three-letter currency code such as USD")
        return code


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
