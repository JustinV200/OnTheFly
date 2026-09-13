"""The only module that calls USAspending's award search; responses are validated into typed awards before use.
Prime contract awards only: subawards are a separate query this client doesn't make (roadmap open question 3).
Errors carry a safe message and never the raw response body.
"""

from datetime import date
from decimal import ROUND_HALF_UP, Decimal

import httpx
from pydantic import BaseModel, Field, ValidationError

USASPENDING_AWARD_SEARCH_URL = "https://api.usaspending.gov/api/v2/search/spending_by_award/"
USASPENDING_AWARD_PAGE_URL = "https://www.usaspending.gov/award/"
# A public API with no key; long enough for a large search, short enough that an owner's click doesn't hang.
REQUEST_TIMEOUT_SECONDS = 20.0
# The endpoint rejects a search without an award-type group (HTTP 422). A-D are the contract types:
# BPA call, purchase order, delivery order and definitive contract.
CONTRACT_AWARD_TYPE_CODES = ("A", "B", "C", "D")
# One page, largest awards first: enough to see repeat suppliers without paging a public API per click.
MAX_AWARDS_PER_SEARCH = 100
_FIELDS = [
    "Award ID",
    "Recipient Name",
    "Recipient UEI",
    "Awarding Agency",
    "Award Amount",
    "Start Date",
    "NAICS",
    "PSC",
    "Place of Performance State Code",
    "generated_internal_id",
]


class AwardSearch(BaseModel):
    """One award search: classification codes, optional place-of-performance states, and the action-date window."""

    naics_codes: list[str]
    psc_codes: list[str] = Field(default_factory=list)
    # Two-letter codes. Empty searches every state, and the caller says so wherever results are shown.
    place_of_performance_states: list[str] = Field(default_factory=list)
    start_date: date
    end_date: date


class UsaSpendingAward(BaseModel):
    """One prime contract award as the rest of the app reads it. Amounts are integer cents in USD."""

    # The PIID. Not unique on its own: the same PIID can recur under different parent contracts.
    award_id: str
    # USAspending's unique award key (e.g. CONT_AWD_<PIID>_<agency>_<parent>_<agency>); None when absent.
    generated_award_id: str | None
    recipient_name: str
    # None when USAspending publishes no UEI; such an award is listed but never counted as an identified supplier.
    recipient_uei: str | None
    awarding_agency: str | None
    amount_minor: int | None
    start_date: date | None
    naics_code: str | None
    psc_code: str | None
    place_of_performance_state: str | None
    # USAspending's award page; None when the row has no generated award id to link to.
    url: str | None


class UsaSpendingError(Exception):
    """A USAspending request failed; the message is safe to store and show."""


class _Code(BaseModel):
    code: str | None = None


class _RawAward(BaseModel):
    """One result row, keyed by the display field names the search requested."""

    award_id: str | None = Field(default=None, alias="Award ID")
    recipient_name: str | None = Field(default=None, alias="Recipient Name")
    recipient_uei: str | None = Field(default=None, alias="Recipient UEI")
    awarding_agency: str | None = Field(default=None, alias="Awarding Agency")
    award_amount: Decimal | None = Field(default=None, alias="Award Amount")
    start_date: date | None = Field(default=None, alias="Start Date")
    # Current responses return {code, description}; older ones returned the bare code.
    naics: _Code | str | None = Field(default=None, alias="NAICS")
    psc: _Code | str | None = Field(default=None, alias="PSC")
    place_of_performance_state: str | None = Field(default=None, alias="Place of Performance State Code")
    generated_internal_id: str | None = None
    # USAspending's row id; a higher id is a more recently loaded record.
    internal_id: int | None = None


class _SearchResponse(BaseModel):
    results: list[_RawAward]


class UsaSpendingClient:
    """Sends one award search per call to USAspending's fixed host."""

    def __init__(self, http_client: httpx.Client | None = None) -> None:
        """Keep an optional injected client (tests pass one built on httpx.MockTransport)."""

        self._http_client = http_client

    def search_awards(self, search: AwardSearch) -> list[UsaSpendingAward]:
        """Return up to MAX_AWARDS_PER_SEARCH contract awards, largest first, one per award; raise UsaSpendingError on failure.

        Rows without an award id or recipient name are dropped: they can't be cited or shown to an owner.
        """

        payload = {
            "filters": _filters(search),
            "fields": _FIELDS,
            "limit": MAX_AWARDS_PER_SEARCH,
            "page": 1,
            "sort": "Award Amount",
            "order": "desc",
        }
        try:
            if self._http_client is not None:
                response = self._http_client.post(
                    USASPENDING_AWARD_SEARCH_URL, json=payload, timeout=REQUEST_TIMEOUT_SECONDS
                )
            else:
                with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
                    response = client.post(USASPENDING_AWARD_SEARCH_URL, json=payload)
        except httpx.TimeoutException as exc:
            raise UsaSpendingError("USAspending award search timed out") from exc
        except httpx.HTTPError as exc:
            # The class name only: some httpx messages echo request details we don't want stored.
            raise UsaSpendingError(f"USAspending request failed ({exc.__class__.__name__})") from exc

        if response.status_code == 429:
            raise UsaSpendingError("USAspending rate limit reached (HTTP 429); try again later")
        if response.is_error:
            raise UsaSpendingError(f"USAspending award search failed (HTTP {response.status_code})")
        try:
            # Amounts parse as Decimal straight from the JSON text, so cents never pass through a float.
            parsed = _SearchResponse.model_validate(response.json(parse_float=Decimal))
        except (ValidationError, ValueError) as exc:
            raise UsaSpendingError("USAspending returned an unexpected response shape") from exc
        return _one_row_per_award(parsed.results)


def _one_row_per_award(rows: list[_RawAward]) -> list[UsaSpendingAward]:
    # The search can return one award twice, as two loaded records with different amounts (seen in the recorded
    # DevSecOps response). Counting both would inflate a supplier's award count and total, so the most recently
    # loaded row wins, in the position the award first appeared.
    kept: dict[str, tuple[int, UsaSpendingAward]] = {}
    for row in rows:
        award = _award_from(row)
        if award is None:
            continue
        key = award.generated_award_id or award.award_id
        loaded = row.internal_id or 0
        if key not in kept or loaded > kept[key][0]:
            kept[key] = (loaded, award)
    return [award for _, award in kept.values()]


def _filters(search: AwardSearch) -> dict[str, object]:
    filters: dict[str, object] = {
        "time_period": [{"start_date": search.start_date.isoformat(), "end_date": search.end_date.isoformat()}],
        "award_type_codes": list(CONTRACT_AWARD_TYPE_CODES),
        "naics_codes": search.naics_codes,
    }
    if search.psc_codes:
        filters["psc_codes"] = search.psc_codes
    if search.place_of_performance_states:
        filters["place_of_performance_locations"] = [
            {"country": "USA", "state": state} for state in search.place_of_performance_states
        ]
    return filters


def _award_from(row: _RawAward) -> UsaSpendingAward | None:
    award_id = (row.award_id or "").strip()
    recipient_name = (row.recipient_name or "").strip()
    if not award_id or not recipient_name:
        return None
    uei = (row.recipient_uei or "").strip().upper()
    return UsaSpendingAward(
        award_id=award_id,
        generated_award_id=row.generated_internal_id,
        recipient_name=recipient_name,
        recipient_uei=uei or None,
        awarding_agency=row.awarding_agency,
        amount_minor=_minor_units(row.award_amount),
        start_date=row.start_date,
        naics_code=_code(row.naics),
        psc_code=_code(row.psc),
        place_of_performance_state=row.place_of_performance_state,
        url=f"{USASPENDING_AWARD_PAGE_URL}{row.generated_internal_id}" if row.generated_internal_id else None,
    )


def _minor_units(amount: Decimal | None) -> int | None:
    if amount is None:
        return None
    return int((amount * 100).quantize(Decimal(1), rounding=ROUND_HALF_UP))


def _code(value: _Code | str | None) -> str | None:
    if isinstance(value, _Code):
        return value.code
    return value
