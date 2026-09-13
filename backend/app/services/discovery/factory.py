"""Chooses the configured discovery source implementation.
The active source is controlled centrally by settings.discovery_source; this is the only place concrete sources are named.
"""

from app.core.config import Settings
from app.services.discovery.fixture.source import FixtureDiscoverySource
from app.services.discovery.source import DiscoverySource
from app.services.discovery.tavily.source import TavilyDiscoverySource

# Labels by stored source name, so a past run still reads correctly after the configured source changes.
_LABELS: dict[str, str] = {
    FixtureDiscoverySource.name: FixtureDiscoverySource.label,
    TavilyDiscoverySource.name: TavilyDiscoverySource.label,
}


def get_discovery_source(settings: Settings) -> DiscoverySource:
    """Return the discovery source named by settings; raise ValueError for an unknown name."""

    if settings.discovery_source == "fixture":
        # Default: deterministic fictional providers, labeled as demo data, with no network or quota.
        return FixtureDiscoverySource()
    if settings.discovery_source == "tavily":
        # Real web search. With no TAVILY_API_KEY it reports "not run" rather than falling back to fixtures.
        return TavilyDiscoverySource(api_key=settings.tavily_api_key)
    raise ValueError(f"Unsupported discovery_source: {settings.discovery_source}")


def discovery_source_label(source_name: str) -> str:
    """Return the human label for a stored source name; an unknown name is shown as itself, not hidden."""

    return _LABELS.get(source_name, source_name)
