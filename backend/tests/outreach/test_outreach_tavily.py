"""Exercises the Tavily discovery source without network: missing key, parsed results, and HTTP failure."""

import json

import httpx
import pytest
from sqlalchemy import func, select

from app.core.config import get_settings
from app.models.outreach import DiscoveryRun, ProviderCandidate
from app.services.discovery import run_discovery
from app.services.discovery.tavily.extract import find_published_email
from app.services.discovery.tavily.source import TavilyDiscoverySource
from tests.outreach.support import OWNER_HEADERS, OWNER_ID, publish_cleaning_listing

_RESULTS = [
    {
        "title": "Mission Street Maintenance | Commercial Cleaning SF",
        "url": "https://missionstreet.example/contact",
        "content": "Office cleaning three nights a week. Email office@missionstreet.example for a quote.",
    },
    {
        "title": "Harbor Light Facility Care - Office Cleaning",
        "url": "https://harborlight.example/",
        "content": "Call us for floor care and janitorial service. logo@2x.png",
    },
    {
        "title": "Top 10 Commercial Cleaners in San Francisco - Yelp",
        "url": "https://www.yelp.com/search?find_desc=cleaning",
        "content": "Reviews of many companies.",
    },
]


def _client(handler) -> httpx.Client:
    return httpx.Client(transport=httpx.MockTransport(handler))


def test_without_a_key_discovery_is_recorded_as_not_run(client, db_session, monkeypatch: pytest.MonkeyPatch) -> None:
    listing = publish_cleaning_listing(db_session)
    monkeypatch.setenv("DISCOVERY_SOURCE", "tavily")
    monkeypatch.setenv("TAVILY_API_KEY", "")
    get_settings.cache_clear()

    response = client.post(f"/api/invitations/listings/{listing.id}/discover", headers=OWNER_HEADERS)
    overview = client.get(f"/api/invitations/listings/{listing.id}", headers=OWNER_HEADERS).json()

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "unavailable"
    assert "TAVILY_API_KEY is not configured" in response.json()["detail"]
    assert response.json()["found_count"] == 0
    assert overview["discovery"]["source"] == {
        "name": "tavily",
        "label": "Web search (Tavily)",
        "available": False,
        "unavailable_reason": "TAVILY_API_KEY is not configured — web discovery not run",
    }
    assert overview["discovery"]["last_run"]["status"] == "unavailable"
    assert db_session.scalar(select(func.count()).select_from(ProviderCandidate)) == 0


def test_results_are_parsed_and_email_is_kept_only_when_published(db_session) -> None:
    listing = publish_cleaning_listing(db_session)
    requests: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json={"query": json.loads(request.content)["query"], "results": _RESULTS})

    source = TavilyDiscoverySource(api_key="tvly-test-key", http_client=_client(respond))
    run = run_discovery(listing.id, OWNER_ID, db_session, source)

    assert run.status == "ok"
    assert requests and all(request.url.host == "api.tavily.com" for request in requests)
    assert requests[0].headers["Authorization"] == "Bearer tvly-test-key"
    assert json.loads(requests[0].content)["search_depth"] == "basic"
    # Every query returned the same three hits: one aggregator per query, the rest merged by domain.
    assert run.dropped_aggregator_count == len(requests)
    assert run.new_candidate_count == 2

    candidates = {
        candidate.business_name: candidate for candidate in db_session.scalars(select(ProviderCandidate)).all()
    }
    mission = candidates["Mission Street Maintenance"]
    assert mission.contact_email == "office@missionstreet.example"
    assert mission.contact_email_source_url == "https://missionstreet.example/contact"
    assert mission.website_url == "https://missionstreet.example"
    assert mission.provenance == "public_web"
    assert mission.retrieved_at is not None
    harbor = candidates["Harbor Light Facility Care"]
    assert harbor.contact_email is None
    assert harbor.contact_email_source_url is None


def test_an_http_error_records_an_error_run_and_keeps_nothing(db_session) -> None:
    listing = publish_cleaning_listing(db_session)
    source = TavilyDiscoverySource(api_key="tvly-test-key", http_client=_client(lambda request: httpx.Response(500)))

    run = run_discovery(listing.id, OWNER_ID, db_session, source)

    assert run.status == "error"
    assert "HTTP 500" in (run.detail or "")
    assert "tvly-test-key" not in (run.detail or "")
    assert (run.found_count, run.new_candidate_count) == (0, 0)
    assert db_session.scalar(select(func.count()).select_from(ProviderCandidate)) == 0
    assert db_session.scalar(select(func.count()).select_from(DiscoveryRun)) == 1


def test_email_extraction_ignores_placeholders_images_and_no_reply() -> None:
    assert find_published_email("icon@2x.png and noreply@acme.example and example@acme.example") is None
    assert find_published_email("Write to Quotes@Acme.example.") == "quotes@acme.example"
