"""Supplier discovery from USAspending prime contract awards, with optional Tavily public-web enrichment.
Only award recipients with a UEI become providers; Tavily adds context to that fixed shortlist and never adds one.
"""

from datetime import date, datetime, timezone

import httpx

from app.services.discovery.source import DiscoverySource
from app.services.discovery.tavily.client import TavilyClient, TavilyError
from app.services.discovery.types import DiscoveredProvider, DiscoveryQuery, DiscoverySearchResult
from app.services.discovery.usaspending.classification import naics_codes_for
from app.services.discovery.usaspending.enrich import enrich_supplier
from app.services.discovery.usaspending.shortlist import shortlist_suppliers
from app.services.market_data.usaspending import AwardSearch, UsaSpendingClient, UsaSpendingError, states_in_area

# Roadmap 12, step 8 queries a 5-year lookback; discovery uses the same window so both read the same market.
LOOKBACK_YEARS = 5


class UsaSpendingTavilyDiscoverySource(DiscoverySource):
    """Finds recent contract awardees for the listing's industry and area, then enriches that shortlist."""

    name = "usaspending_tavily"
    label = "USAspending contract awards (public records), enriched by web search (Tavily)"

    def __init__(self, tavily_api_key: str, http_client: httpx.Client | None = None) -> None:
        """Keep the Tavily key; http_client is injected by tests so no request leaves the machine."""

        self._tavily_api_key = tavily_api_key
        self._http_client = http_client

    def unavailable_reason(self) -> str | None:
        """USAspending needs no key, so the source can always run; a missing Tavily key is stated in the run detail."""

        return None

    def search(self, queries: list[DiscoveryQuery]) -> DiscoverySearchResult:
        """Search awards once for the listing's category and area, shortlist by UEI, then enrich each supplier.

        Every phrasing shares one category and area, and awards are searched by classification rather than
        free text, so only the first query is read. A USAspending failure keeps nothing. A Tavily failure
        keeps the award suppliers, since they stand on their own, and the detail says where enrichment stopped.
        """

        retrieved_at = datetime.now(timezone.utc)
        if not queries:
            return DiscoverySearchResult(status="ok", detail="No public listing fields to search", retrieved_at=retrieved_at)
        query = queries[0]
        naics_codes = naics_codes_for(query.category)
        if not naics_codes:
            return DiscoverySearchResult(
                status="unavailable",
                detail=f'No NAICS industry is mapped for category "{query.category}"; USAspending discovery not run',
                retrieved_at=retrieved_at,
            )

        states = states_in_area(query.service_area)
        today = retrieved_at.date()
        search = AwardSearch(
            naics_codes=list(naics_codes),
            place_of_performance_states=states,
            start_date=_years_before(today, LOOKBACK_YEARS),
            end_date=today,
        )
        try:
            awards = UsaSpendingClient(self._http_client).search_awards(search)
        except UsaSpendingError as error:
            return DiscoverySearchResult(status="error", detail=f"{error}; no results were kept", retrieved_at=retrieved_at)

        shortlist = shortlist_suppliers(awards, retrieved_at)
        providers, enrichment_note = self._enrich(shortlist, query.category, retrieved_at)
        notes = [_search_note(search, len(awards), len(shortlist), query.service_area), enrichment_note]
        return DiscoverySearchResult(
            status="ok", detail=" ".join(note for note in notes if note), retrieved_at=retrieved_at, providers=providers
        )

    def _enrich(
        self, providers: list[DiscoveredProvider], category: str, retrieved_at: datetime
    ) -> tuple[list[DiscoveredProvider], str]:
        if not providers:
            return providers, ""
        if not self._tavily_api_key:
            return providers, "Web enrichment not run: TAVILY_API_KEY is not configured."
        client = TavilyClient(self._tavily_api_key, self._http_client)
        enriched: list[DiscoveredProvider] = []
        for provider in providers:
            try:
                enriched.append(enrich_supplier(provider, category, client, retrieved_at))
            except TavilyError as error:
                # The rest keep their award evidence unenriched; the count tells the owner exactly which part ran.
                done = len(enriched)
                return [*enriched, *providers[done:]], (
                    f"Web enrichment stopped after {done} of {len(providers)} suppliers: {error}."
                )
        return enriched, f"Web enrichment ran for all {len(providers)} suppliers (name search, not identity-verified)."


def _search_note(search: AwardSearch, award_count: int, supplier_count: int, service_area: str) -> str:
    where = (
        f"place of performance {', '.join(search.place_of_performance_states)}"
        if search.place_of_performance_states
        # A search that couldn't be narrowed says so, rather than letting nationwide results pass as local.
        else f'all states (no US state read from "{service_area}")'
    )
    return (
        f"{supplier_count} suppliers by UEI from {award_count} prime contract awards "
        f"(NAICS {', '.join(search.naics_codes)}; {where}; since {search.start_date.isoformat()}). "
        "Subawards not searched."
    )


def _years_before(day: date, years: int) -> date:
    try:
        return day.replace(year=day.year - years)
    except ValueError:
        # 29 February minus whole years can land on a date that doesn't exist.
        return day.replace(year=day.year - years, day=28)
