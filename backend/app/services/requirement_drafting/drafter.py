"""The interface every requirement drafter implements, and the errors a drafter may raise.
Only factory.py names a concrete drafter; everything else depends on this module.
"""

from typing import Protocol

from app.services.requirement_drafting.types import DraftRequest, ModelDraft


class DraftingUnavailableError(Exception):
    """Drafting can't run in this configuration (no API key); the message says what's missing."""


class DraftingError(Exception):
    """A drafting request ran and failed; the message is safe to show and never holds a key or raw response."""


class RequirementDrafter(Protocol):
    """Drafts requirement rows from an owner's description."""

    # The model identifier recorded with every draft, or None for a drafter that never calls a model.
    model: str | None
    prompt_version: str | None

    def draft(self, request: DraftRequest) -> ModelDraft:
        """Return the model's draft; raise DraftingUnavailableError or DraftingError instead of returning nothing."""
        ...
