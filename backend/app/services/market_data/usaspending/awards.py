"""Parses prime contract award search results into typed awards, one per award.
Validation happens here, at the response boundary; nothing downstream reads the raw rows.
"""

from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field

from app.services.market_data.usaspending.search import award_page_url, dollars_to_minor

AWARD_FIELDS = [
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
AWARD_SORT_FIELD = "Award Amount"


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


class AwardSearchResponse(BaseModel):
    """The part of a prime award search response the client reads."""

    results: list[_RawAward]


def awards_from_response(response: AwardSearchResponse) -> list[UsaSpendingAward]:
    """Return one award per generated award id, in the order each first appeared.

    The search can return one award twice, as two loaded records with different amounts (seen in the recorded
    DevSecOps response). Counting both would inflate a supplier's award count and total, so the most recently
    loaded row wins. Rows without an award id or recipient name are dropped: they can't be cited or shown.
    """

    kept: dict[str, tuple[int, UsaSpendingAward]] = {}
    for row in response.results:
        award = _award_from(row)
        if award is None:
            continue
        key = award.generated_award_id or award.award_id
        loaded = row.internal_id or 0
        if key not in kept or loaded > kept[key][0]:
            kept[key] = (loaded, award)
    return [award for _, award in kept.values()]


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
        amount_minor=dollars_to_minor(row.award_amount),
        start_date=row.start_date,
        naics_code=_code(row.naics),
        psc_code=_code(row.psc),
        place_of_performance_state=row.place_of_performance_state,
        url=award_page_url(row.generated_internal_id),
    )


def _code(value: _Code | str | None) -> str | None:
    if isinstance(value, _Code):
        return value.code
    return value
