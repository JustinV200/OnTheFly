"""Structured supplier discovery from USAspending, with optional Tavily enrichment.

Only award recipients enter the shortlist.  Tavily adds public-web context to
those recipients and never creates a supplier by itself.
"""

from collections import defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx

from app.core.provenance import ProviderCandidateProvenance
from app.services.discovery.tavily.client import TavilyClient, TavilyError
from app.services.discovery.tavily.extract import summarize_content, website_from_url
from app.services.discovery.types import (
    DiscoveredProvider,
    DiscoveryQuery,
    DiscoverySearchResult,
)

USA_SPENDING_AWARDS_URL = "https://api.usaspending.gov/api/v2/search/spending_by_award/"
_MAX_SHORTLIST = 10
_DEVSECOPS_NAICS = ("541512", "541519")


class UsaSpendingTavilyDiscoverySource:
    """Find recent DevSecOps awardees by UEI, then enrich that fixed shortlist."""

    name = "usaspending_tavily"
    label = "USAspending awards with Tavily public-web enrichment"

    def __init__(
        self, tavily_api_key: str, http_client: httpx.Client | None = None
    ) -> None:
        self._tavily_api_key = tavily_api_key
        self._http_client = http_client

    def unavailable_reason(self) -> str | None:
        # USAspending needs no key.  A missing Tavily key is reported in the run
        # detail while award discovery still proceeds.
        return None

    def search(self, queries: list[DiscoveryQuery]) -> DiscoverySearchResult:
        retrieved_at = datetime.now(UTC)
        if not queries:
            return DiscoverySearchResult(
                status="ok",
                detail="No confirmed scope queries",
                retrieved_at=retrieved_at,
            )
        try:
            awards = self._awards(queries[0])
        except httpx.TimeoutException:
            return DiscoverySearchResult(
                status="error",
                detail="USAspending request timed out",
                retrieved_at=retrieved_at,
            )
        except (httpx.HTTPError, TypeError, ValueError):
            return DiscoverySearchResult(
                status="error",
                detail="USAspending returned an unavailable or invalid response",
                retrieved_at=retrieved_at,
            )

        providers = self._shortlist(awards, queries[0], retrieved_at)
        if not self._tavily_api_key:
            return DiscoverySearchResult(
                status="ok",
                retrieved_at=retrieved_at,
                providers=providers,
                detail="USAspending awards retrieved; Tavily enrichment not run because TAVILY_API_KEY is not configured",
            )
        try:
            providers = [self._enrich(provider, queries[0]) for provider in providers]
        except TavilyError as error:
            # Awards are valid completed work, so retain them and state the web gap.
            return DiscoverySearchResult(
                status="ok",
                retrieved_at=retrieved_at,
                providers=providers,
                detail=f"USAspending awards retrieved; Tavily enrichment unavailable: {error}",
            )
        return DiscoverySearchResult(
            status="ok",
            retrieved_at=retrieved_at,
            providers=providers,
            detail="USAspending awards retrieved; deterministic UEI shortlist enriched through Tavily",
        )

    def _awards(self, query: DiscoveryQuery) -> list[dict[str, Any]]:
        state = _state_from_area(query.service_area)
        filters: dict[str, Any] = {
            "time_period": [
                {
                    "start_date": (datetime.now(UTC) - timedelta(days=365 * 3))
                    .date()
                    .isoformat(),
                    "end_date": datetime.now(UTC).date().isoformat(),
                }
            ],
            "naics_codes": list(_DEVSECOPS_NAICS),
        }
        if state:
            filters["place_of_performance_locations"] = [
                {"country": "USA", "state": state}
            ]
        payload = {
            "filters": filters,
            "fields": [
                "Award ID",
                "Recipient Name",
                "Recipient UEI",
                "Awarding Agency",
                "Award Amount",
                "Action Date",
                "NAICS",
                "PSC",
                "Place of Performance State Code",
                "Place of Performance City Code",
            ],
            "limit": 100,
            "page": 1,
            "sort": "Award Amount",
            "order": "desc",
        }
        if self._http_client:
            response = self._http_client.post(USA_SPENDING_AWARDS_URL, json=payload)
        else:
            with httpx.Client(timeout=20.0) as client:
                response = client.post(USA_SPENDING_AWARDS_URL, json=payload)
        response.raise_for_status()
        body = response.json()
        results = body.get("results")
        if not isinstance(results, list):
            raise TypeError("missing results")
        return [award for award in results if isinstance(award, dict)]

    def _shortlist(
        self,
        awards: list[dict[str, Any]],
        query: DiscoveryQuery,
        retrieved_at: datetime,
    ) -> list[DiscoveredProvider]:
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for award in awards:
            uei = str(
                award.get("recipient_uei") or award.get("Recipient UEI") or ""
            ).strip()
            name = str(
                award.get("Recipient Name") or award.get("recipient_name") or ""
            ).strip()
            if uei and name:
                grouped[uei].append(award)
        # Award count, then total reported amount, then UEI: stable and reviewable.
        ranked = sorted(
            grouped.items(),
            key=lambda item: (
                -len(item[1]),
                -sum(_amount(a) for a in item[1]),
                item[0],
            ),
        )[:_MAX_SHORTLIST]
        providers: list[DiscoveredProvider] = []
        for uei, supplier_awards in ranked:
            first = supplier_awards[0]
            name = str(
                first.get("Recipient Name") or first.get("recipient_name")
            ).strip()
            evidence = [
                _award_evidence(award, retrieved_at) for award in supplier_awards
            ]
            providers.append(
                DiscoveredProvider(
                    business_name=name,
                    supplier_uei=uei,
                    service_area=query.service_area or None,
                    source_urls=[item["url"] for item in evidence],
                    evidence=evidence,
                    provenance=ProviderCandidateProvenance.public_award.value,
                )
            )
        return providers

    def _enrich(
        self, provider: DiscoveredProvider, query: DiscoveryQuery
    ) -> DiscoveredProvider:
        client = TavilyClient(self._tavily_api_key, self._http_client)
        response = client.search(
            f'"{provider.business_name}" {query.category} {query.service_area}'
        )
        hits = response.results
        if not hits:
            return provider
        urls = [hit.url for hit in hits]
        snippets = [
            summarize_content(hit.content)
            for hit in hits
            if summarize_content(hit.content)
        ]
        web_evidence = [
            {
                "source": "tavily",
                "url": hit.url,
                "title": hit.title,
                "content": summarize_content(hit.content),
            }
            for hit in hits
        ]
        return provider.model_copy(
            update={
                "website_url": website_from_url(hits[0].url),
                "capability_summary": " ".join(snippets)[:400] or None,
                "source_urls": [*provider.source_urls, *urls],
                "evidence": [*provider.evidence, *web_evidence],
            }
        )


def _award_evidence(award: dict[str, Any], retrieved_at: datetime) -> dict[str, object]:
    award_id = str(award.get("Award ID") or award.get("award_id") or "").strip()
    return {
        "source": "usaspending_award",
        "url": f"https://www.usaspending.gov/award/{award_id}",
        "retrieved_at": retrieved_at.isoformat(),
        "award_id": award_id,
        "agency": award.get("Awarding Agency") or award.get("awarding_agency_name"),
        "naics": award.get("NAICS") or award.get("naics_code"),
        "psc": award.get("PSC") or award.get("psc_code"),
        "place_of_performance": {
            "state": award.get("Place of Performance State Code"),
            "city": award.get("Place of Performance City Code"),
        },
        "supplier_uei": award.get("recipient_uei") or award.get("Recipient UEI"),
    }


def _amount(award: dict[str, Any]) -> float:
    try:
        return float(
            award.get("Award Amount")
            or award.get("generated_pragmatic_obligation")
            or 0
        )
    except (TypeError, ValueError):
        return 0.0


def _state_from_area(area: str) -> str | None:
    lowered = area.casefold()
    if "virginia" in lowered or " va" in lowered:
        return "VA"
    return None
