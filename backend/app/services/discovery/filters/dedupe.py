"""Collapses the same provider found under several listings or URLs into one (roadmap 08, step 3).
Matching is deterministic (domain, phone, name); merged providers keep every source URL.
"""

from dataclasses import dataclass, field

from pydantic import BaseModel

from app.services.discovery.filters.identity import ProviderIdentity, identity_of
from app.services.discovery.types import DiscoveredProvider


class DedupeResult(BaseModel):
    """One provider per business, and how many raw results were merged into another."""

    kept: list[DiscoveredProvider]
    merged_count: int


@dataclass
class _Group:
    provider: DiscoveredProvider
    identities: list[ProviderIdentity] = field(default_factory=list)

    def matches(self, identity: ProviderIdentity) -> bool:
        return any(existing.matches(identity) for existing in self.identities)


def dedupe_providers(providers: list[DiscoveredProvider]) -> DedupeResult:
    """Merge providers that share a domain, phone, or non-conflicting name; the first-seen one leads.

    Input order decides which record's name and fields win, so results stay reproducible.
    A provider matching two earlier groups joins them into one.
    """

    groups: list[_Group] = []
    for provider in providers:
        identity = identity_of(provider.business_name, provider.website_url, provider.phone)
        matching = [group for group in groups if group.matches(identity)]
        if not matching:
            groups.append(_Group(provider=provider, identities=[identity]))
            continue

        target = matching[0]
        target.provider = merge_providers(target.provider, provider)
        target.identities.append(identity)
        for other in matching[1:]:
            target.provider = merge_providers(target.provider, other.provider)
            target.identities.extend(other.identities)
            groups.remove(other)

    return DedupeResult(kept=[group.provider for group in groups], merged_count=len(providers) - len(groups))


def merge_providers(primary: DiscoveredProvider, duplicate: DiscoveredProvider) -> DiscoveredProvider:
    """Fill the primary's missing fields from the duplicate and union their source URLs in order."""

    has_primary_email = primary.contact_email is not None
    return primary.model_copy(
        update={
            "website_url": primary.website_url or duplicate.website_url,
            # The address and the page it was published on travel together, so the citation stays true.
            "contact_email": primary.contact_email if has_primary_email else duplicate.contact_email,
            "contact_email_source_url": (
                primary.contact_email_source_url if has_primary_email else duplicate.contact_email_source_url
            ),
            "phone": primary.phone or duplicate.phone,
            "service_area": primary.service_area or duplicate.service_area,
            "capability_summary": primary.capability_summary or duplicate.capability_summary,
            "source_urls": list(dict.fromkeys([*primary.source_urls, *duplicate.source_urls])),
        }
    )
