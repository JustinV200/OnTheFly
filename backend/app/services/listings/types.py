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
    # The requirements scope completeness scores offers against, published structured so a
    # challenger can match them exactly rather than reverse-engineer them from scope_summary.
    required_tasks: list[str]
    visit_frequency: str | None
    # The owner's expectations for the offer; None means the owner did not state one.
    supplies_included: bool | None
    equipment_included: bool | None
    taxes_included: bool | None
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
