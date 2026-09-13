"""The only module that talks to the Tavily search API; responses are validated before anyone reads them.
Errors carry a safe message and never the API key or the raw response body.
"""

import httpx
from pydantic import BaseModel, Field, ValidationError

TAVILY_SEARCH_URL = "https://api.tavily.com/search"
# Enough for a slow search, short enough that an owner's click doesn't hang.
REQUEST_TIMEOUT_SECONDS = 15.0
MAX_RESULTS_PER_QUERY = 8


class TavilyResult(BaseModel):
    """One search hit as Tavily returns it."""

    title: str = ""
    url: str
    content: str = ""


class TavilySearchResponse(BaseModel):
    """The part of Tavily's search response discovery reads."""

    results: list[TavilyResult] = Field(default_factory=list)


class TavilyError(Exception):
    """A Tavily request failed; the message is safe to store and show."""


class TavilyClient:
    """Sends one search per call to Tavily's fixed host."""

    def __init__(self, api_key: str, http_client: httpx.Client | None = None) -> None:
        """Keep the key and an optional injected client (tests pass one built on httpx.MockTransport)."""

        self._api_key = api_key
        self._http_client = http_client

    def search(self, query: str) -> TavilySearchResponse:
        """Run one basic-depth search; raise TavilyError on transport, HTTP, or shape failures."""

        payload = {
            "query": query,
            "search_depth": "basic",
            "max_results": MAX_RESULTS_PER_QUERY,
            "include_raw_content": False,
        }
        headers = {"Authorization": f"Bearer {self._api_key}"}
        try:
            if self._http_client is not None:
                response = self._http_client.post(
                    TAVILY_SEARCH_URL, json=payload, headers=headers, timeout=REQUEST_TIMEOUT_SECONDS
                )
            else:
                with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
                    response = client.post(TAVILY_SEARCH_URL, json=payload, headers=headers)
        except httpx.TimeoutException as exc:
            raise TavilyError("Tavily search timed out") from exc
        except httpx.HTTPError as exc:
            # The class name only: some httpx messages echo request details we don't want stored.
            raise TavilyError(f"Tavily request failed ({exc.__class__.__name__})") from exc

        if response.status_code in (401, 403):
            raise TavilyError(f"Tavily rejected the API key (HTTP {response.status_code})")
        if response.status_code == 429:
            raise TavilyError("Tavily rate limit reached (HTTP 429); try again later")
        if response.is_error:
            raise TavilyError(f"Tavily search failed (HTTP {response.status_code})")
        try:
            return TavilySearchResponse.model_validate(response.json())
        except (ValidationError, ValueError) as exc:
            raise TavilyError("Tavily returned an unexpected response shape") from exc
