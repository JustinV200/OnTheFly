"""Provider discovery for outbound invitations (roadmap 08, steps 1-4).
Public surface: the source interface and factory, query builder, identity keys, and discovery runs.
"""

from app.services.discovery.factory import discovery_source_label, get_discovery_source
from app.services.discovery.filters import ProviderIdentity, build_dedupe_key, identity_of, registrable_domain
from app.services.discovery.query import build_discovery_queries
from app.services.discovery.runs import DiscoveryRunView, discovery_run_view, run_discovery
from app.services.discovery.source import DiscoverySource
from app.services.discovery.types import DiscoveredProvider, DiscoveryQuery, DiscoverySearchResult, DiscoveryStatus

__all__ = [
    "DiscoveredProvider",
    "DiscoveryQuery",
    "DiscoveryRunView",
    "DiscoverySearchResult",
    "DiscoverySource",
    "DiscoveryStatus",
    "ProviderIdentity",
    "build_dedupe_key",
    "build_discovery_queries",
    "discovery_run_view",
    "discovery_source_label",
    "get_discovery_source",
    "identity_of",
    "registrable_domain",
    "run_discovery",
]
