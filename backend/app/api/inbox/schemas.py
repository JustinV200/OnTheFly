"""Response schemas for owner challenge inbox and comparison endpoints."""

from pydantic import BaseModel


class SavingsResponse(BaseModel):
    """Represents serialized savings data for API responses."""

    annual_recurring_savings_minor: int
    first_year_net_savings_minor: int
    is_provisional: bool
    assumptions: list[str]
    label: str


class InboxChallengeResponse(BaseModel):
    """Represents one owner-visible challenge row in the inbox."""

    challenge_id: str
    challenger_name: str
    normalized_price_minor: int
    price_currency: str
    scope_completeness: float
    missing_items: list[str]
    added_items: list[str]
    unstated_items: list[str]
    savings: SavingsResponse
    evidence_status: str
    platform_check_status: str
    identity_check_status: str
    registry_check_status: str
    provenance: str
    bidding_mode_at_submission: str


class InboxResponse(BaseModel):
    """Wraps the owner inbox rows for one listing."""

    challenges: list[InboxChallengeResponse]
    bidding_mode: str


class ComparisonRowResponse(BaseModel):
    """Represents one side-by-side comparison row, including the incumbent baseline."""

    challenge_id: str | None
    challenger_name: str
    is_incumbent: bool
    normalized_price_minor: int
    price_currency: str
    scope_completeness: float
    missing_items: list[str]
    added_items: list[str]
    unstated_items: list[str]
    savings: SavingsResponse | None
    provenance: str


class ComparisonResponse(BaseModel):
    """Wraps side-by-side comparison rows for the owner view."""

    rows: list[ComparisonRowResponse]
