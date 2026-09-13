"""Adds public-web context to one award supplier with a Tavily name search.
Enrichment only fills a supplier's missing contact details; it never adds a supplier or changes its UEI.
"""

from datetime import datetime

from app.services.discovery.evidence import WebEvidence, merge_evidence
from app.services.discovery.filters.aggregators import AGGREGATOR_DOMAINS
from app.services.discovery.filters.domain import registrable_domain
from app.services.discovery.tavily.client import TavilyClient, TavilyResult
from app.services.discovery.tavily.extract import find_published_email, summarize_content, website_from_url
from app.services.discovery.types import DiscoveredProvider
from app.services.listings.category_label import category_label


def enrich_supplier(
    provider: DiscoveredProvider, category: str, client: TavilyClient, retrieved_at: datetime
) -> DiscoveredProvider:
    """Search the supplier's name with the category and return it with web evidence and any details found.

    Every hit is kept as name-search evidence. Website, email and summary come from one page only, the
    first hit that isn't a directory, social profile or procurement aggregator, so details from
    different pages never mix. Raises TavilyError when the search fails.
    """

    response = client.search(f'"{provider.business_name}" {category_label(category)}')
    if not response.results:
        return provider

    web_evidence = [_evidence(hit, retrieved_at) for hit in response.results]
    site = next((hit for hit in response.results if registrable_domain(hit.url) not in AGGREGATOR_DOMAINS), None)
    update: dict[str, object] = {"evidence": merge_evidence(provider.evidence, web_evidence)}
    if site is not None:
        update.update(
            {
                "website_url": provider.website_url or website_from_url(site.url),
                "capability_summary": provider.capability_summary or summarize_content(site.content),
                "source_urls": list(dict.fromkeys([*provider.source_urls, site.url])),
            }
        )
        email = find_published_email(site.content)
        if provider.contact_email is None and email:
            # The page the address appeared on travels with it, so the owner can check it was published for inquiries.
            update.update({"contact_email": email, "contact_email_source_url": site.url})
    return provider.model_copy(update=update)


def _evidence(hit: TavilyResult, retrieved_at: datetime) -> WebEvidence:
    return WebEvidence(
        source="tavily",
        url=hit.url,
        title=hit.title or None,
        snippet=summarize_content(hit.content),
        retrieved_at=retrieved_at,
    )
