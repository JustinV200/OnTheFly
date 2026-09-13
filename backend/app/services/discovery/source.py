"""Declares the provider discovery interface (roadmap 08, step 1).
Callers depend on this protocol; only discovery/factory.py picks a concrete source.
"""

from typing import Protocol

from app.services.discovery.types import DiscoveryQuery, DiscoverySearchResult


class DiscoverySource(Protocol):
    """Finds providers for a listing from its public query phrasings."""

    # Stable key stored on runs and candidates, e.g. "fixture" or "tavily".
    name: str
    # Human label shown beside results, saying plainly what kind of data they are.
    label: str

    def unavailable_reason(self) -> str | None:
        """Return why the source cannot run right now, or None when it can."""

    def search(self, queries: list[DiscoveryQuery]) -> DiscoverySearchResult:
        """Run every query and return raw providers with an explicit ok/unavailable/error status."""
