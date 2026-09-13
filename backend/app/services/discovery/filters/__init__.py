"""Discovery result filters: aggregator removal, deduplication, and the identity keys both rely on."""

from app.services.discovery.filters.aggregators import AggregatorFilterResult, drop_aggregators
from app.services.discovery.filters.dedupe import DedupeResult, dedupe_providers, merge_providers
from app.services.discovery.filters.domain import registrable_domain
from app.services.discovery.filters.identity import (
    ProviderIdentity,
    build_dedupe_key,
    identity_of,
    normalize_business_name,
)

__all__ = [
    "AggregatorFilterResult",
    "DedupeResult",
    "ProviderIdentity",
    "build_dedupe_key",
    "dedupe_providers",
    "drop_aggregators",
    "identity_of",
    "merge_providers",
    "normalize_business_name",
    "registrable_domain",
]
