"""The only module that talks to the OpenAI API: one structured-output chat completion per call, parsed as JSON.
Errors carry a safe message and never the API key or the raw response body.
"""

import json

import httpx

OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions"
# A draft takes about 2 seconds; the ceiling leaves room for a slow response without hanging the owner's click forever.
REQUEST_TIMEOUT_SECONDS = 45.0


class OpenAIError(Exception):
    """An OpenAI request failed; the message is safe to show."""


class OpenAIClient:
    """Sends chat completions to OpenAI's fixed host."""

    def __init__(self, api_key: str, http_client: httpx.Client | None = None) -> None:
        """Keep the key and an optional injected client (tests pass one built on httpx.MockTransport)."""

        self._api_key = api_key
        self._http_client = http_client

    def complete_json(self, model: str, messages: list[dict[str, str]], schema_name: str, schema: dict[str, object]) -> object:
        """Return the decoded JSON the model produced under a strict schema; raise OpenAIError on any failure."""

        payload = {
            "model": model,
            "messages": messages,
            "response_format": {"type": "json_schema", "json_schema": {"name": schema_name, "strict": True, "schema": schema}},
        }
        headers = {"Authorization": f"Bearer {self._api_key}"}
        try:
            if self._http_client is not None:
                response = self._http_client.post(OPENAI_CHAT_COMPLETIONS_URL, json=payload, headers=headers, timeout=REQUEST_TIMEOUT_SECONDS)
            else:
                with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
                    response = client.post(OPENAI_CHAT_COMPLETIONS_URL, json=payload, headers=headers)
        except httpx.TimeoutException as exc:
            raise OpenAIError("OpenAI took too long to answer; try again") from exc
        except httpx.HTTPError as exc:
            # The class name only: some httpx messages echo request details we don't want shown.
            raise OpenAIError(f"OpenAI request failed ({exc.__class__.__name__})") from exc

        if response.status_code in (401, 403):
            raise OpenAIError(f"OpenAI rejected the API key (HTTP {response.status_code})")
        if response.status_code == 429:
            raise OpenAIError("OpenAI rate limit or quota reached (HTTP 429); try again later")
        if response.is_error:
            raise OpenAIError(f"OpenAI request failed (HTTP {response.status_code})")
        return _message_json(response)


def _message_json(response: httpx.Response) -> object:
    try:
        choice = response.json()["choices"][0]
        message = choice["message"]
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise OpenAIError("OpenAI returned an unexpected response shape") from exc
    if message.get("refusal"):
        raise OpenAIError("The model declined to draft requirements for this description")
    if choice.get("finish_reason") == "length":
        raise OpenAIError("The model's answer was cut off; shorten the description and try again")
    try:
        return json.loads(message["content"])
    except (KeyError, TypeError, ValueError) as exc:
        raise OpenAIError("OpenAI returned a draft that isn't valid JSON") from exc
