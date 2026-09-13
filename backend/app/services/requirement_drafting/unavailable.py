"""The drafter used when no OpenAI key is configured: it reports drafting as not run and never invents rows."""

from app.services.requirement_drafting.drafter import DraftingUnavailableError
from app.services.requirement_drafting.types import DraftRequest, ModelDraft


class UnavailableRequirementDrafter:
    """Always refuses, so a missing key reads as "not run" rather than an empty draft that looks like a result."""

    model: str | None = None
    prompt_version: str | None = None

    def draft(self, request: DraftRequest) -> ModelDraft:
        """Raise DraftingUnavailableError naming the missing setting."""

        raise DraftingUnavailableError("AI drafting isn't set up: OPENAI_API_KEY is empty. Add requirements by hand.")
