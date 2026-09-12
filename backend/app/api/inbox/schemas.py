"""Response schemas for owner challenge inbox and comparison endpoints."""

from datetime import datetime

from pydantic import BaseModel

from app.services.evidence.status import EvidenceRollup
from app.services.listings.types import PublicListingProjection


class EvidenceCheckSummary(BaseModel):
    """One named check's source, time, and limits, so a status never displays without its origin."""

    source: str
    status: str
    match_confidence: str | None
    checked_at: datetime
    limitations: str


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
    evidence_rollup: EvidenceRollup
    platform_check_status: str
    identity_check_status: str
    registry_check_status: str
    # Every check, including ones that did not run, in a fixed order: platform, identity, registry.
    evidence_checks: list[EvidenceCheckSummary]
    evidence_last_updated: datetime
    provenance: str
    bidding_mode_at_submission: str
    submitted_at: datetime
    revised_at: datetime | None


class InboxResponse(BaseModel):
    """Wraps the owner inbox rows for one listing, plus the listing they answer."""

    challenges: list[InboxChallengeResponse]
    bidding_mode: str
    # The stored public record for this listing. It reports "private" after unpublishing, which
    # is how the inbox shows that retained offers belong to a listing nobody can see now.
    listing: PublicListingProjection


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
