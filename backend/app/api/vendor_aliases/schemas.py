"""Request and response schemas for owner-only vendor alias suggestions."""

from pydantic import BaseModel

from app.services.expenses.aliases import VendorAliasSuggestion
from app.services.flybrain import BrainStimulus, FlyBrainAttribution


class VendorAliasListResponse(BaseModel):
    """Suggestions for the acting owner, with the fly-brain circuit that found them."""

    suggestions: list[VendorAliasSuggestion]
    fly_brain: list[FlyBrainAttribution]
    # The name codes FlyHash compared, replayed by the live brain panel; None when there was nothing to compare.
    brain_stimulus: BrainStimulus | None = None


class VendorAliasPairRequest(BaseModel):
    """Identifies one suggestion by its two expenses; used by merge and dismiss."""

    alias_expense_id: str
    canonical_expense_id: str


class VendorAliasMergeResponse(BaseModel):
    """The canonical expense after the merge re-synced its baseline."""

    expense_id: str
    vendor: str
    period_count: int
    amount_minor_per_period: int
    currency: str
    cadence: str


class VendorAliasDismissResponse(BaseModel):
    """Confirms which vendor pair will no longer be suggested."""

    alias_vendor: str
    canonical_vendor: str
