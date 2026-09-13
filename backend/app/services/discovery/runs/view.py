"""The owner-facing shape of a recorded discovery run, with its source labeled."""

from datetime import datetime, timezone
import json

from pydantic import BaseModel

from app.models.outreach.discovery_run import DiscoveryRun
from app.services.discovery.factory import discovery_source_label
from app.services.discovery.types import DiscoveryStatus


class DiscoveryRunView(BaseModel):
    """One discovery run as the API returns it."""

    id: str
    listing_id: str
    source: str
    source_label: str
    status: DiscoveryStatus
    detail: str | None
    queries: list[str]
    found_count: int
    dropped_aggregator_count: int
    merged_duplicate_count: int
    new_candidate_count: int
    ran_at: datetime


def discovery_run_view(run: DiscoveryRun) -> DiscoveryRunView:
    """Serialize a stored run; SQLite's naive timestamps are re-marked UTC, the zone every run is stored in."""

    ran_at = run.ran_at if run.ran_at.tzinfo is not None else run.ran_at.replace(tzinfo=timezone.utc)
    return DiscoveryRunView(
        id=run.id,
        listing_id=run.listing_id,
        source=run.source,
        source_label=discovery_source_label(run.source),
        status=run.status,  # type: ignore[arg-type]  # stored from DiscoveryStatus; pydantic re-validates it
        detail=run.detail,
        queries=json.loads(run.queries),
        found_count=run.found_count,
        dropped_aggregator_count=run.dropped_aggregator_count,
        merged_duplicate_count=run.merged_duplicate_count,
        new_candidate_count=run.new_candidate_count,
        ran_at=ran_at,
    )
