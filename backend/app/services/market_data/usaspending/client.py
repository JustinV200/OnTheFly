"""The only module that calls USAspending's contract search, for prime awards and for reported subawards.
Responses are validated into typed records before use; errors carry a safe message and never the raw response body.
"""

from decimal import Decimal
from typing import TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from app.services.market_data.usaspending.awards import (
    AWARD_FIELDS,
    AWARD_SORT_FIELD,
    AwardSearchResponse,
    UsaSpendingAward,
    awards_from_response,
)
from app.services.market_data.usaspending.search import AwardSearch, search_filters
from app.services.market_data.usaspending.subawards import (
    SUBAWARD_FIELDS,
    SUBAWARD_SORT_FIELD,
    SubawardSearchResponse,
    UsaSpendingSubaward,
    subawards_from_response,
)

USASPENDING_AWARD_SEARCH_URL = "https://api.usaspending.gov/api/v2/search/spending_by_award/"
# A public API with no key; long enough for a large search, short enough that an owner's click doesn't hang.
REQUEST_TIMEOUT_SECONDS = 20.0
# One page, largest first: enough to see repeat suppliers without paging a public API per click.
MAX_RESULTS_PER_SEARCH = 100

_Response = TypeVar("_Response", bound=BaseModel)


class UsaSpendingError(Exception):
    """A USAspending request failed; the message is safe to store and show."""


class UsaSpendingClient:
    """Sends one contract search per call to USAspending's fixed host."""

    def __init__(self, http_client: httpx.Client | None = None) -> None:
        """Keep an optional injected client (tests pass one built on httpx.MockTransport)."""

        self._http_client = http_client

    def search_awards(self, search: AwardSearch) -> list[UsaSpendingAward]:
        """Return up to MAX_RESULTS_PER_SEARCH prime contract awards, largest first; raise UsaSpendingError on failure."""

        body = self._post(search, AWARD_FIELDS, AWARD_SORT_FIELD, is_subaward_search=False, shape=AwardSearchResponse)
        return awards_from_response(body)

    def search_subawards(self, search: AwardSearch) -> list[UsaSpendingSubaward]:
        """Return up to MAX_RESULTS_PER_SEARCH reported subawards under matching contracts, largest first.

        Raises UsaSpendingError on failure. Subaward reporting depends on primes filing it, so absence proves nothing.
        """

        body = self._post(
            search, SUBAWARD_FIELDS, SUBAWARD_SORT_FIELD, is_subaward_search=True, shape=SubawardSearchResponse
        )
        return subawards_from_response(body)

    def _post(
        self,
        search: AwardSearch,
        fields: list[str],
        sort_field: str,
        is_subaward_search: bool,
        shape: type[_Response],
    ) -> _Response:
        payload = {
            "filters": search_filters(search),
            "fields": fields,
            "limit": MAX_RESULTS_PER_SEARCH,
            "page": 1,
            "sort": sort_field,
            "order": "desc",
            "subawards": is_subaward_search,
        }
        kind = "subaward" if is_subaward_search else "award"
        try:
            if self._http_client is not None:
                response = self._http_client.post(
                    USASPENDING_AWARD_SEARCH_URL, json=payload, timeout=REQUEST_TIMEOUT_SECONDS
                )
            else:
                with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
                    response = client.post(USASPENDING_AWARD_SEARCH_URL, json=payload)
        except httpx.TimeoutException as exc:
            raise UsaSpendingError(f"USAspending {kind} search timed out") from exc
        except httpx.HTTPError as exc:
            # The class name only: some httpx messages echo request details we don't want stored.
            raise UsaSpendingError(f"USAspending request failed ({exc.__class__.__name__})") from exc

        if response.status_code == 429:
            raise UsaSpendingError("USAspending rate limit reached (HTTP 429); try again later")
        if response.is_error:
            raise UsaSpendingError(f"USAspending {kind} search failed (HTTP {response.status_code})")
        try:
            # Amounts parse as Decimal straight from the JSON text, so cents never pass through a float.
            return shape.model_validate(response.json(parse_float=Decimal))
        except (ValidationError, ValueError) as exc:
            raise UsaSpendingError("USAspending returned an unexpected response shape") from exc
