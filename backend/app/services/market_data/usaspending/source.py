"""The live market-data source (MARKET_DATA_SOURCE=live): USAspending prime awards and reported subawards as supplier
evidence (roadmap 12, step 8). No public labor-rate client exists in this build, so rate queries report "unavailable",
which renders as not checked. It never falls back to demo data.
"""

from datetime import datetime, timezone

import httpx

from app.services.market_data.source import (
    AwardRecord,
    LaborRateQuery,
    LaborRateRetrieval,
    SupplierQuery,
    SupplierRetrieval,
)
from app.services.market_data.usaspending.awards import UsaSpendingAward
from app.services.market_data.usaspending.client import UsaSpendingClient, UsaSpendingError
from app.services.market_data.usaspending.place_of_performance import states_in_area
from app.services.market_data.usaspending.search import AwardSearch, lookback_start
from app.services.market_data.usaspending.subawards import UsaSpendingSubaward

_RATES_NOT_CHECKED = (
    "Not checked: no public labor-rate source (such as GSA CALC+) is wired into this build, so no rate was queried."
)


class UsaSpendingMarketDataSource:
    """Answers supplier queries from USAspending and labor-rate queries as unavailable."""

    name = "usaspending"

    def __init__(self, http_client: httpx.Client | None = None) -> None:
        """Keep an optional injected HTTP client (tests pass one built on httpx.MockTransport)."""

        self._client = UsaSpendingClient(http_client)

    def find_suppliers(self, query: SupplierQuery) -> SupplierRetrieval:
        """Return prime awards then subawards for the segment's PSC and NAICS, where it's performed, over the lookback.

        A failed prime search makes the retrieval unavailable (nothing was checked). A failed subaward search keeps
        the prime awards and says subawards weren't checked, so the supplier count is still an honest floor.
        """

        retrieved_at = datetime.now(timezone.utc)
        if not query.psc and not query.naics:
            return _suppliers_unavailable(query, retrieved_at, "Not checked: the segment has no PSC or NAICS tag.")

        states = states_in_area(query.place_of_performance or "")
        today = retrieved_at.date()
        search = AwardSearch(
            naics_codes=[query.naics] if query.naics else [],
            psc_codes=[query.psc] if query.psc else [],
            place_of_performance_states=states,
            start_date=lookback_start(today, query.lookback_years),
            end_date=today,
        )
        try:
            awards = self._client.search_awards(search)
        except UsaSpendingError as error:
            return _suppliers_unavailable(query, retrieved_at, f"Not checked: {error}.")
        subaward_note: str
        try:
            subawards = self._client.search_subawards(search)
            subaward_note = "Subaward codes and place are the prime award's, and subaward reporting is incomplete."
        except UsaSpendingError as error:
            subawards = []
            subaward_note = f"Subawards not checked: {error}."

        records = [*_prime_records(awards), *_subaward_records(subawards)]
        return SupplierRetrieval(
            source=self.name,
            provenance="public_api",
            status="ok" if records else "no_match",
            query=query,
            retrieved_at=retrieved_at,
            records=records,
            limitations=" ".join([_scope_note(search, query), subaward_note, _omitted_note(awards, subawards)]).strip(),
        )

    def find_labor_rates(self, query: LaborRateQuery) -> LaborRateRetrieval:
        """Return an unavailable labor-rate retrieval."""

        return LaborRateRetrieval(
            source=self.name,
            provenance="public_api",
            status="unavailable",
            query=query,
            retrieved_at=datetime.now(timezone.utc),
            matched_labor_categories=[],
            rates_minor_per_hour=[],
            limitations=_RATES_NOT_CHECKED,
        )


def _prime_records(awards: list[UsaSpendingAward]) -> list[AwardRecord]:
    # AwardRecord needs an amount; a row USAspending published without one is left out and counted in the limitations.
    return [
        AwardRecord(
            award_id=award.award_id,
            award_type="prime",
            recipient_name=award.recipient_name,
            uei=award.recipient_uei,
            amount_minor=award.amount_minor,
            currency="USD",
            # The award's start date: the search returns no single action date for an award.
            action_date=award.start_date,
            url=award.url,
        )
        for award in awards
        if award.amount_minor is not None
    ]


def _subaward_records(subawards: list[UsaSpendingSubaward]) -> list[AwardRecord]:
    return [
        AwardRecord(
            award_id=subaward.subaward_id,
            award_type="subaward",
            recipient_name=subaward.subrecipient_name,
            uei=subaward.subrecipient_uei,
            amount_minor=subaward.amount_minor,
            currency="USD",
            action_date=subaward.subaward_date,
            url=subaward.url,
        )
        for subaward in subawards
        if subaward.amount_minor is not None
    ]


def _scope_note(search: AwardSearch, query: SupplierQuery) -> str:
    codes = ", ".join(
        [*(f"PSC {code}" for code in search.psc_codes), *(f"NAICS {code}" for code in search.naics_codes)]
    )
    where = (
        f"performed in {', '.join(search.place_of_performance_states)}"
        if search.place_of_performance_states
        # An unreadable place is searched nationwide and said so, rather than passing national counts off as local.
        else f'in all states (no US state read from "{query.place_of_performance or ""}")'
    )
    return (
        f"Public USAspending contract records: prime awards and reported subawards for {codes}, {where}, "
        f"since {search.start_date.isoformat()}. At most the 100 largest of each, so supplier counts are floors."
    )


def _omitted_note(awards: list[UsaSpendingAward], subawards: list[UsaSpendingSubaward]) -> str:
    omitted = sum(1 for award in awards if award.amount_minor is None) + sum(
        1 for subaward in subawards if subaward.amount_minor is None
    )
    return f"{omitted} records without a published amount were left out." if omitted else ""


def _suppliers_unavailable(query: SupplierQuery, retrieved_at: datetime, limitations: str) -> SupplierRetrieval:
    return SupplierRetrieval(
        source=UsaSpendingMarketDataSource.name,
        provenance="public_api",
        status="unavailable",
        query=query,
        retrieved_at=retrieved_at,
        records=[],
        limitations=limitations,
    )
