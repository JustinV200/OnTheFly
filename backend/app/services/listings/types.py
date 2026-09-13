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


class PublicRequirement(BaseModel):
    """One requirement as bidders see it: what to do, how many hours, and which labor category."""

    # Opaque and fresh per task, so it links a piece to nothing upstream. Offers answer requirements by this key.
    key: str
    text: str
    priority: str
    labor_category: str | None
    # Hours per the listing's billing period; None when the poster left the estimate unanswered.
    hours: int | None


class PublicConstraint(BaseModel):
    """One constraint a bidder must meet: clearance, location, insurance, or set-aside."""

    kind: str
    value: str


class PublicScopeField(BaseModel):
    """One category template field rendered for the public, e.g. "Environments: AWS GovCloud"."""

    label: str
    value: str


class PublicListingProjection(BaseModel):
    """Represents the exact additive public listing payload.

    Every task origin serves this one shape, each built field by field by its own builder: rebid listings in
    services/listings/projection.py, new tasks and pieces in services/tasks/listing/projection.py. It has no field
    for a parent task, a poster, an accepted price, rates, a remainder or savings, so none can be served.
    """

    id: str
    # Set only for a rebid of observed spend; None for a new task or a piece.
    expense_id: str | None
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
    # None when the poster hides the price or a new task has no budget; the card then says "Price not disclosed".
    price_minor: int | None
    price_currency: str
    billing_cadence: str
    service_area_approximate: str
    bidding_mode: str
    challenge_deadline: datetime | None
    incumbent_vendor_name: str | None
    show_exact_address: bool
    visibility: str
    published_at: datetime | None
    # Roadmap 12 additions. Defaults keep every earlier payload valid and identical in meaning.
    title: str | None = None
    requirements: list[PublicRequirement] = []
    constraints: list[PublicConstraint] = []
    scope_fields: list[PublicScopeField] = []
    # A piece split from an accepted task: payment depends on the account above.
    is_subcontract: bool = False
    # False when the poster chose not to show a price. Distinct from a missing budget only to the poster.
    price_disclosed: bool = True
