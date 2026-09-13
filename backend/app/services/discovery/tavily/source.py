"""Web discovery through Tavily search, mapped into raw providers with public-web provenance.
Without a key it reports "not run"; a failed request reports an error. Neither falls back to demo data.
"""

from datetime import datetime, timezone

import httpx

from app.core.provenance import ProviderCandidateProvenance
from app.services.discovery.source import DiscoverySource
from app.services.discovery.tavily.client import TavilyClient, TavilyError, TavilyResult
from app.services.discovery.tavily.extract import (
    business_name_from_title,
    find_published_email,
    summarize_content,
    website_from_url,
)
from app.services.discovery.types import DiscoveredProvider, DiscoveryQuery, DiscoverySearchResult

MISSING_KEY_DETAIL = "TAVILY_API_KEY is not configured — web discovery not run"


class TavilyDiscoverySource(DiscoverySource):
    """Runs each query phrasing as one Tavily search and returns every hit as a raw provider."""

    name = "tavily"
    label = "Web search (Tavily)"

    def __init__(self, api_key: str, http_client: httpx.Client | None = None) -> None:
        """Keep the key; http_client is injected by tests so no request leaves the machine."""

        self._api_key = api_key
        self._http_client = http_client

    def unavailable_reason(self) -> str | None:
        """Return the missing-key reason, or None once a key is configured."""

        return None if self._api_key else MISSING_KEY_DETAIL

    def search(self, queries: list[DiscoveryQuery]) -> DiscoverySearchResult:
        """Search every phrasing; the first failed request makes the whole run an error with no providers.

        Partial results are discarded on purpose: a run that silently lost half its searches would
        look like a complete picture of the market.
        """

        if not self._api_key:
            return DiscoverySearchResult(
                status="unavailable",
                detail=MISSING_KEY_DETAIL,
                retrieved_at=datetime.now(timezone.utc),
            )

        client = TavilyClient(self._api_key, self._http_client)
        providers: list[DiscoveredProvider] = []
        for query in queries:
            try:
                response = client.search(query.text)
            except TavilyError as error:
                return DiscoverySearchResult(
                    status="error",
                    detail=f'{error} (query: "{query.text}"); no results were kept',
                    retrieved_at=datetime.now(timezone.utc),
                )
            providers.extend(_provider_from(result, query) for result in response.results)

        return DiscoverySearchResult(status="ok", retrieved_at=datetime.now(timezone.utc), providers=providers)


def _provider_from(result: TavilyResult, query: DiscoveryQuery) -> DiscoveredProvider:
    email = find_published_email(result.content)
    return DiscoveredProvider(
        business_name=business_name_from_title(result.title, result.url),
        page_title=result.title or None,
        website_url=website_from_url(result.url),
        contact_email=email,
        # The page the address appeared on, so the owner can check it was published for inquiries.
        contact_email_source_url=result.url if email else None,
        # Search snippets rarely state coverage reliably; the searched area is recorded, not claimed.
        service_area=None,
        capability_summary=summarize_content(result.content),
        source_urls=[result.url],
        provenance=ProviderCandidateProvenance.public_web.value,
    )
