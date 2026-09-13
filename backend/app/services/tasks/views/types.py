"""Declares the task detail and My work shapes a participant sees. Built only for the task's poster or owner."""

from datetime import datetime

from pydantic import BaseModel

from app.services.listings.types import PublicScopeField
from app.services.splitting.ledger import TaskLedger
from app.services.tasks.money import BuyerMoneyView, OwnerMoneyView, PieceLine


class PieceRef(BaseModel):
    """The viewer's own piece a requirement went to."""

    task_id: str
    title: str | None


class RequirementRow(BaseModel):
    """One requirement on the task's current (or accepted) scope, with where it went if the viewer split it off."""

    key: str
    text: str
    priority: str
    labor_category: str | None
    psc: str | None
    naics: str | None
    tags_status: str
    hours_estimate: int | None
    hours_status: str
    source: str
    piece: PieceRef | None


class ConstraintRow(BaseModel):
    """One constraint, and whether it flowed down from the task this one was split from."""

    kind: str
    value: str
    is_inherited: bool


class ListingSummary(BaseModel):
    """The task's listing as its poster manages it."""

    id: str
    visibility: str
    bidding_mode: str
    price_disclosed: bool
    # The poster's own stated price (listed rebid price, budget, or cut), shown to the poster whether or not public.
    stated_price_minor: int | None
    offer_count: int
    published_at: datetime | None
    challenge_deadline: datetime | None
    scope_version_number: int


class TaskEventView(BaseModel):
    """One audited event, in words."""

    kind: str
    created_at: datetime
    actor_name: str
    summary: str


class TaskDetail(BaseModel):
    """Everything one participant may see about one task."""

    id: str
    origin: str
    state: str
    title: str | None
    category: str
    currency: str
    billing_period: str
    depth: int
    created_at: datetime
    relationship: str
    is_posted_by_you: bool
    is_owned_by_you: bool
    is_subcontract: bool
    parent_scope_changed_at: datetime | None
    expense_id: str | None
    listing: ListingSummary | None
    scope_version_number: int | None
    requirements: list[RequirementRow]
    constraints: list[ConstraintRow]
    scope_fields: list[PublicScopeField]
    ledger: TaskLedger | None
    pieces: list[PieceLine]
    buyer_money: BuyerMoneyView | None
    owner_money: OwnerMoneyView | None
    can_split: bool
    split_block_reason: str | None
    active_suggested_pieces: int
    max_suggested_pieces: int
    events: list[TaskEventView]


class WorkItem(BaseModel):
    """One task on My work."""

    task_id: str
    title: str | None
    origin: str
    state: str
    category: str
    currency: str
    billing_period: str
    relationship: str
    is_subcontract: bool
    listing_id: str | None
    listing_visibility: str | None
    offer_count: int
    buyer_money: BuyerMoneyView | None
    owner_money: OwnerMoneyView | None
    # A short "what to do next" for the demo, e.g. "Draft piece: confirm, preview and publish".
    next_step: str | None


class WorkResponse(BaseModel):
    """My work: tasks won through accepted offers, and tasks this business posted."""

    owned: list[WorkItem]
    posted: list[WorkItem]
