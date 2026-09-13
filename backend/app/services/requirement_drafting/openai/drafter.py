"""Drafts requirement rows with an OpenAI model. It asks for the strict schema in prompt.py and checks the answer's
shape; whether each row is usable is decided afterwards by normalize.py, in code.
"""

from pydantic import ValidationError

from app.services.requirement_drafting.drafter import DraftingError
from app.services.requirement_drafting.openai.client import OpenAIClient, OpenAIError
from app.services.requirement_drafting.openai.prompt import PROMPT_VERSION, RESPONSE_SCHEMA, SCHEMA_NAME, build_messages
from app.services.requirement_drafting.types import DraftRequest, ModelDraft


class OpenAIRequirementDrafter:
    """One chat completion per draft, recorded with its model and prompt version."""

    prompt_version: str | None = PROMPT_VERSION

    def __init__(self, client: OpenAIClient, model: str) -> None:
        """Keep the client and the configured model identifier."""

        self._client = client
        self.model: str | None = model

    def draft(self, request: DraftRequest) -> ModelDraft:
        """Return the model's draft; raise DraftingError when the request fails or the answer has the wrong shape."""

        try:
            answer = self._client.complete_json(str(self.model), build_messages(request), SCHEMA_NAME, RESPONSE_SCHEMA)
        except OpenAIError as error:
            raise DraftingError(str(error)) from error
        try:
            return ModelDraft.model_validate(answer)
        except ValidationError as error:
            raise DraftingError("The model's draft didn't match the requirement format; try again") from error
