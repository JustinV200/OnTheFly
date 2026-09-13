"""Deterministic demo discovery from a checked-in file of fictional providers.
The rehearsal seam roadmap 08 step 1 asks for: no network, no quota, and results labeled as demo data, never as a web search.
"""

from datetime import datetime, timezone
from pathlib import Path

from pydantic import BaseModel

from app.core.provenance import ProviderCandidateProvenance
from app.services.discovery.source import DiscoverySource
from app.services.discovery.types import DiscoveredProvider, DiscoveryQuery, DiscoverySearchResult

_DATA_PATH = Path(__file__).with_name("providers.json")

# "commercial_cleaning" is an older stored key for the same category (see the marketplace category filter).
_CATEGORY_ALIASES: dict[str, str] = {"commercial_cleaning": "cleaning"}


class _FixtureProvider(BaseModel):
    """One provider entry as written in providers.json."""

    business_name: str
    page_title: str | None = None
    website_url: str | None = None
    contact_email: str | None = None
    contact_email_source_url: str | None = None
    phone: str | None = None
    service_area: str | None = None
    capability_summary: str | None = None
    source_urls: list[str]


class _FixtureFile(BaseModel):
    """The providers.json document: provider lists keyed by category."""

    categories: dict[str, list[_FixtureProvider]]


class FixtureDiscoverySource(DiscoverySource):
    """Returns the fictional providers for a listing's category, including one aggregator and one duplicate."""

    name = "fixture"
    label = "Demo discovery data — fictional providers, not a web search"

    def unavailable_reason(self) -> str | None:
        """The fixture file ships with the code, so this source can always run."""

        return None

    def search(self, queries: list[DiscoveryQuery]) -> DiscoverySearchResult:
        """Return every demo provider for the queried category; the phrasings themselves don't filter demo data."""

        retrieved_at = datetime.now(timezone.utc)
        category = queries[0].category.strip().casefold() if queries else ""
        category = _CATEGORY_ALIASES.get(category, category)
        # Validated at the file boundary: a malformed fixture raises instead of silently finding nothing.
        document = _FixtureFile.model_validate_json(_DATA_PATH.read_text(encoding="utf-8"))
        entries = document.categories.get(category, [])
        if not entries:
            return DiscoverySearchResult(
                status="ok",
                detail="No demo providers for this category",
                retrieved_at=retrieved_at,
                providers=[],
            )

        providers = [
            DiscoveredProvider(**entry.model_dump(), provenance=ProviderCandidateProvenance.demo_data.value)
            for entry in entries
        ]
        return DiscoverySearchResult(
            status="ok",
            detail=f"{len(providers)} fictional demo results for this category; not a web search",
            retrieved_at=retrieved_at,
            providers=providers,
        )
