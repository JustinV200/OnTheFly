"""Drops directories, review sites, marketplaces, and listicles from discovery results (roadmap 08, step 3).
A page listing twenty cleaning companies is not a cleaning company.
"""

import re

from pydantic import BaseModel

from app.services.discovery.filters.domain import registrable_domain
from app.services.discovery.types import DiscoveredProvider

# Registrable domains of directories, lead marketplaces, social networks, job boards, and procurement
# aggregators. Local-service results are dominated by these, and none of them can quote the job.
AGGREGATOR_DOMAINS = frozenset(
    {
        "angi.com", "angieslist.com", "bark.com", "bbb.org", "bing.com", "birdeye.com", "bizapedia.com",
        "buildzoom.com", "chamberofcommerce.com", "clutch.co", "dnb.com", "expertise.com", "facebook.com",
        "glassdoor.com", "google.com", "govtribe.com", "highergov.com", "homeadvisor.com", "houzz.com",
        "indeed.com", "instagram.com", "linkedin.com", "manta.com", "mapquest.com", "nextdoor.com",
        "pinterest.com", "porch.com", "reddit.com", "sam.gov", "superpages.com", "thumbtack.com",
        "trustpilot.com", "twitter.com", "upcity.com", "usaspending.gov", "wikipedia.org", "x.com",
        "yahoo.com", "yellowpages.com", "yelp.com", "youtube.com", "zoominfo.com",
    }
)

# Listicle titles ("Top 10 ...", "10 Best ...", "Best ... near ...", "... near me").
_LISTICLE_TITLE_PATTERNS = (
    re.compile(r"\btop\s+\d+\b", re.IGNORECASE),
    re.compile(r"\b\d+\s+best\b", re.IGNORECASE),
    re.compile(r"\bbest\b.*\bnear\b", re.IGNORECASE),
    re.compile(r"\bnear me\b", re.IGNORECASE),
)


class AggregatorFilterResult(BaseModel):
    """Providers that survived the filter, and how many aggregator results were dropped."""

    kept: list[DiscoveredProvider]
    dropped_count: int


def drop_aggregators(providers: list[DiscoveredProvider]) -> AggregatorFilterResult:
    """Return providers minus aggregator results, judged by domain first and listicle title second."""

    kept = [provider for provider in providers if not _is_aggregator(provider)]
    return AggregatorFilterResult(kept=kept, dropped_count=len(providers) - len(kept))


def _is_aggregator(provider: DiscoveredProvider) -> bool:
    # A UEI means USAspending recorded this business winning a contract, so it is a supplier, never a directory.
    # Its source URLs are usaspending.gov award pages, which would otherwise read as an aggregator domain.
    if provider.supplier_uei:
        return False
    urls = [provider.website_url, *provider.source_urls]
    if any(registrable_domain(url) in AGGREGATOR_DOMAINS for url in urls if url):
        return True
    titles = [title for title in (provider.page_title, provider.business_name) if title]
    return any(pattern.search(title) for pattern in _LISTICLE_TITLE_PATTERNS for title in titles)
