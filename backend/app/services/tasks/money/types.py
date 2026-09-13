"""Declares the money views: what a task's poster and its owner each see, in one currency and billing period.
Each view names only direct counterparties; neither carries a field for anything two steps away (roadmap 12, step 10).
"""

from pydantic import BaseModel


class Counterparty(BaseModel):
    """A direct counterparty on this task: the client (for its owner) or the accepted bidder (for its poster)."""

    role: str
    business_name: str
    handle: str


class PieceLine(BaseModel):
    """One piece the viewer split off, as the account that pays for it sees it."""

    task_id: str
    title: str | None
    cut_minor: int
    accepted_price_minor: int | None
    # accepted_price_minor when accepted, else cut_minor.
    committed_minor: int
    status: str
    listing_visibility: str | None
    offer_count: int
    # The piece's winner, visible to the account that posted the piece (its direct counterparty).
    accepted_bidder: Counterparty | None
    is_subcontract: bool


class OwnerMoneyView(BaseModel):
    """A task the viewer won through an accepted offer: what it's paid, what it paid out, and what's left."""

    task_id: str
    currency: str
    billing_period: str
    client: Counterparty | None
    starting_price_minor: int
    pieces: list[PieceLine]
    total_cuts_minor: int
    committed_minor: int
    remainder_minor: int
    # Retained requirements × the owner's internal rates; None when any hours or rate are missing (listed below).
    keep_cost_minor: int | None
    keep_cost_gaps: list[str]
    # remainder − keep cost; "potential" until the work actually changes hands.
    potential_margin_minor: int | None


class BuyerMoneyView(BaseModel):
    """A task the viewer posted: its baseline, what it accepted or is still pending, and potential savings."""

    task_id: str
    origin: str
    currency: str
    billing_period: str
    # Observed spend (rebid), the budget (new, None without one), or the cut (a piece this account split off).
    baseline_minor: int | None
    baseline_label: str
    task_status: str
    # The accepted offer's price, or the current listed price while pending.
    task_amount_minor: int | None
    accepted_bidder: Counterparty | None
    # Pieces this account split off before accepting an offer; they stay its own.
    own_pieces: list[PieceLine]
    committed_minor: int | None
    potential_difference_minor: int | None
    difference_label: str
    is_fully_accepted: bool
