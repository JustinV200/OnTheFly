"""Parses reported subaward search results into typed subawards, one per subaward.
A subaward is identified by its prime award plus its own number; subaward numbers alone repeat across primes.
"""

from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field

from app.services.market_data.usaspending.search import award_page_url, dollars_to_minor

SUBAWARD_FIELDS = [
    "Sub-Award ID",
    "Sub-Awardee Name",
    "Sub-Recipient UEI",
    "Sub-Award Amount",
    "Sub-Award Date",
    "Prime Award ID",
    "Prime Recipient Name",
    "Awarding Agency",
    "prime_award_generated_internal_id",
]
SUBAWARD_SORT_FIELD = "Sub-Award Amount"


class UsaSpendingSubaward(BaseModel):
    """One subaward a prime contractor reported under a contract. Amounts are integer cents in USD."""

    subaward_id: str
    subrecipient_name: str
    # None when the prime reported no UEI; such a subaward is listed but never counted as an identified supplier.
    subrecipient_uei: str | None
    amount_minor: int | None
    subaward_date: date | None
    prime_award_id: str | None
    prime_generated_award_id: str | None
    prime_recipient_name: str | None
    awarding_agency: str | None
    # The prime award's USAspending page, which lists its reported subawards; None without a prime id.
    url: str | None


class _RawSubaward(BaseModel):
    """One result row, keyed by the display field names the search requested."""

    subaward_id: str | None = Field(default=None, alias="Sub-Award ID")
    subrecipient_name: str | None = Field(default=None, alias="Sub-Awardee Name")
    subrecipient_uei: str | None = Field(default=None, alias="Sub-Recipient UEI")
    amount: Decimal | None = Field(default=None, alias="Sub-Award Amount")
    subaward_date: date | None = Field(default=None, alias="Sub-Award Date")
    prime_award_id: str | None = Field(default=None, alias="Prime Award ID")
    prime_recipient_name: str | None = Field(default=None, alias="Prime Recipient Name")
    awarding_agency: str | None = Field(default=None, alias="Awarding Agency")
    prime_award_generated_internal_id: str | None = None


class SubawardSearchResponse(BaseModel):
    """The part of a subaward search response the client reads."""

    results: list[_RawSubaward]


def subawards_from_response(response: SubawardSearchResponse) -> list[UsaSpendingSubaward]:
    """Return one subaward per (prime award, subaward number), first occurrence kept, in response order.

    Rows without a subaward number or subrecipient name are dropped: they can't be cited or shown.
    """

    kept: dict[tuple[str, str], UsaSpendingSubaward] = {}
    for row in response.results:
        subaward = _subaward_from(row)
        if subaward is None:
            continue
        key = (subaward.prime_generated_award_id or subaward.prime_award_id or "", subaward.subaward_id)
        kept.setdefault(key, subaward)
    return list(kept.values())


def _subaward_from(row: _RawSubaward) -> UsaSpendingSubaward | None:
    subaward_id = (row.subaward_id or "").strip()
    name = (row.subrecipient_name or "").strip()
    if not subaward_id or not name:
        return None
    uei = (row.subrecipient_uei or "").strip().upper()
    return UsaSpendingSubaward(
        subaward_id=subaward_id,
        subrecipient_name=name,
        subrecipient_uei=uei or None,
        amount_minor=dollars_to_minor(row.amount),
        subaward_date=row.subaward_date,
        prime_award_id=row.prime_award_id,
        prime_generated_award_id=row.prime_award_generated_internal_id,
        prime_recipient_name=row.prime_recipient_name,
        awarding_agency=row.awarding_agency,
        url=award_page_url(row.prime_award_generated_internal_id),
    )
