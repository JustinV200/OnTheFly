"""Chooses the requirement drafter. This is the only place concrete drafters are named.
OpenAI is active whenever OPENAI_API_KEY is set; without it the unavailable drafter reports drafting as not run.
"""

from app.core.config import Settings
from app.services.requirement_drafting.drafter import RequirementDrafter
from app.services.requirement_drafting.openai import OpenAIClient, OpenAIRequirementDrafter
from app.services.requirement_drafting.unavailable import UnavailableRequirementDrafter


def get_requirement_drafter(settings: Settings) -> RequirementDrafter:
    """Return the OpenAI drafter when a key is configured, otherwise the one that refuses with a reason."""

    if settings.openai_api_key:
        return OpenAIRequirementDrafter(OpenAIClient(api_key=settings.openai_api_key), model=settings.openai_model)
    # No key: never fall back to canned rows, which would read as AI output that nothing produced.
    return UnavailableRequirementDrafter()
