"""Shared listing request and projection models.
These types make additive public payloads explicit across services and APIs.
"""

from datetime import datetime

from pydantic import BaseModel


class PublishChoices(BaseModel):
    """Captures owner-controlled disclosure choices for one listing."""

    bidding_mode: str = "sealed"
    show_incumbent_vendor: bool = False
    show_exact_address: bool = False


class PublicListingProjection(BaseModel):
    """Represents the exact additive public listing payload."""

    id: str
    expense_id: str
    category: str
    scope_summary: str
    price_minor: int
    price_currency: str
    billing_cadence: str
    service_area_approximate: str
    bidding_mode: str
    challenge_deadline: datetime | None
    incumbent_vendor_name: str | None
    show_exact_address: bool
    visibility: str
    published_at: datetime | None
