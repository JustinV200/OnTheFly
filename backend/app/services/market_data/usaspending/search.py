"""What one USAspending contract search asks for, and the request filters and amounts every search shares.
Prime award and subaward searches send the same filters; only the fields and the subawards flag differ.
"""

from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from pydantic import BaseModel, Field, model_validator

# The endpoint rejects a search without an award-type group (HTTP 422). A-D are the contract types:
# BPA call, purchase order, delivery order and definitive contract.
CONTRACT_AWARD_TYPE_CODES = ("A", "B", "C", "D")
USASPENDING_AWARD_PAGE_URL = "https://www.usaspending.gov/award/"


class AwardSearch(BaseModel):
    """One contract search: classification codes, optional place-of-performance states, and the action-date window.

    For subawards, USAspending applies NAICS, PSC and place of performance to the prime award the subaward sits under.
    """

    naics_codes: list[str] = Field(default_factory=list)
    psc_codes: list[str] = Field(default_factory=list)
    # Two-letter codes. Empty searches every state, and the caller says so wherever results are shown.
    place_of_performance_states: list[str] = Field(default_factory=list)
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def _requires_a_classification(self) -> "AwardSearch":
        # Without a NAICS or PSC code the search would return every federal contract, which is no market at all.
        if not self.naics_codes and not self.psc_codes:
            raise ValueError("An award search needs at least one NAICS or PSC code")
        return self


def search_filters(search: AwardSearch) -> dict[str, object]:
    """Return the request filters for a search; only the codes and states given are sent."""

    filters: dict[str, object] = {
        "time_period": [{"start_date": search.start_date.isoformat(), "end_date": search.end_date.isoformat()}],
        "award_type_codes": list(CONTRACT_AWARD_TYPE_CODES),
    }
    if search.naics_codes:
        filters["naics_codes"] = search.naics_codes
    if search.psc_codes:
        filters["psc_codes"] = search.psc_codes
    if search.place_of_performance_states:
        filters["place_of_performance_locations"] = [
            {"country": "USA", "state": state} for state in search.place_of_performance_states
        ]
    return filters


def dollars_to_minor(amount: Decimal | None) -> int | None:
    """Return a dollar amount parsed from the response as integer cents, rounded half up once; None stays None."""

    if amount is None:
        return None
    return int((amount * 100).quantize(Decimal(1), rounding=ROUND_HALF_UP))


def award_page_url(generated_award_id: str | None) -> str | None:
    """Return USAspending's page for a generated award id, or None when there is no id to link to."""

    return f"{USASPENDING_AWARD_PAGE_URL}{generated_award_id}" if generated_award_id else None
