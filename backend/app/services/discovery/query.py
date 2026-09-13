"""Builds provider search phrasings from a listing's public projection (roadmap 08, step 2).
It reads category, area, tasks, and frequency only; the incumbent's name is never used, because the goal is competitors.
"""

from app.services.discovery.types import DiscoveryQuery
from app.services.listings.category_label import category_label
from app.services.listings.types import PublicListingProjection

# Enough tasks to steer a search toward the scope without turning it into a sentence no page matches.
_MAX_TASKS_IN_QUERY = 3


def build_discovery_queries(projection: PublicListingProjection) -> list[DiscoveryQuery]:
    """Return several distinct query phrasings; one phrasing returns only one slice of the market.

    Assumes the projection is the stored public one. Duplicate phrasings (e.g. when there are no
    tasks) are collapsed, and the order is stable so a rerun sends the same searches.
    """

    label = category_label(projection.category).casefold()
    commercial_label = label if label.startswith("commercial") else f"commercial {label}"
    area = projection.service_area_approximate.strip()
    tasks = " ".join(task.strip() for task in projection.required_tasks[:_MAX_TASKS_IN_QUERY] if task.strip())

    phrasings = [
        f"{commercial_label} companies {area}",
        f"{label} contractor {area} {tasks}",
        f"{label} services {area} request a quote",
    ]
    if projection.visit_frequency:
        phrasings.append(f"{label} {projection.visit_frequency.strip()} service {area}")

    queries: list[DiscoveryQuery] = []
    seen: set[str] = set()
    for phrasing in phrasings:
        text = " ".join(phrasing.split())
        if text.casefold() in seen:
            continue
        seen.add(text.casefold())
        queries.append(DiscoveryQuery(text=text, category=projection.category, service_area=area))
    return queries
