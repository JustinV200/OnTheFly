"""Runs one owner-triggered discovery for a public listing: query, search, filter, dedupe, persist, record.
It never creates an invitation or sends anything; finding a provider is not permission to contact it.
"""

import json

from sqlalchemy.orm import Session

from app.models.outreach.discovery_run import DiscoveryRun
from app.services.discovery.filters.aggregators import drop_aggregators
from app.services.discovery.filters.dedupe import dedupe_providers
from app.services.discovery.query import build_discovery_queries
from app.services.discovery.runs.persist import upsert_discovered_candidates
from app.services.discovery.source import DiscoverySource
from app.services.listings.owned_listing import get_owned_listing, require_public_listing
from app.services.listings.projection import projection_from_record


def run_discovery(listing_id: str, acting_account_id: str, db: Session, source: DiscoverySource) -> DiscoveryRun:
    """Search the source for the owner's public listing and store what it found; return the recorded run.

    Raises 404 for a listing the account doesn't own and 400 for a listing that isn't public.
    An unavailable or failed source is still recorded, with zero counts and the reason, so the
    owner sees "not run" rather than an empty result that looks like a clean search.
    """

    listing = get_owned_listing(listing_id, acting_account_id, db)
    require_public_listing(listing, "provider discovery")
    # Queries come from the stored public projection only, so a search can't leak private scope.
    queries = build_discovery_queries(projection_from_record(listing))
    result = source.search(queries)

    run = DiscoveryRun(
        listing_id=listing.id,
        ran_by_account_id=acting_account_id,
        source=source.name,
        status=result.status,
        detail=result.detail,
        queries=json.dumps([query.text for query in queries]),
        ran_at=result.retrieved_at,
    )
    if result.status == "ok":
        filtered = drop_aggregators(result.providers)
        deduped = dedupe_providers(filtered.kept)
        run.found_count = len(result.providers)
        run.dropped_aggregator_count = filtered.dropped_count
        run.merged_duplicate_count = deduped.merged_count
        run.new_candidate_count = upsert_discovered_candidates(
            listing, deduped.kept, source.name, result.retrieved_at, db
        )
    else:
        run.found_count = 0
        run.dropped_aggregator_count = 0
        run.merged_duplicate_count = 0
        run.new_candidate_count = 0

    db.add(run)
    db.commit()
    db.refresh(run)
    return run
