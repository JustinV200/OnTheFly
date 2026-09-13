"""USAspending suppliers are shortlisted by UEI before Tavily enriches them, and stay distinct through dedupe and reruns.
No test calls either API: USAspending answers from a recorded response and Tavily from canned hits.
"""

import json
from pathlib import Path

import httpx
from sqlalchemy import func, select

from app.core.config import get_settings
from app.models.outreach import ProviderCandidate
from app.services.discovery import run_discovery
from app.services.discovery.filters import dedupe_providers, drop_aggregators
from app.services.discovery.types import DiscoveryQuery
from app.services.discovery.usaspending.source import UsaSpendingTavilyDiscoverySource
from tests.outreach.support import OWNER_HEADERS, OWNER_ID, candidates_by_name, publish_cleaning_listing

RECORDED = json.loads((Path(__file__).parent / "recorded" / "usaspending_awards_devsecops_va.json").read_text("utf-8"))
DEVSECOPS_QUERY = DiscoveryQuery(text="unused", category="devsecops", service_area="Northern Virginia")


def _client(handler) -> httpx.Client:
    return httpx.Client(transport=httpx.MockTransport(handler))


def _tavily_hits(request: httpx.Request) -> httpx.Response:
    # The top hit is a directory profile; the supplier's own page comes second.
    return httpx.Response(
        200,
        json={
            "results": [
                {"title": "Accenture Federal | LinkedIn", "url": "https://www.linkedin.com/company/afs", "content": "x"},
                {
                    "title": "Accenture Federal Services | DevSecOps",
                    "url": "https://www.accenturefederal.example/devsecops",
                    "content": "DevSecOps engineering. Contact federal@accenturefederal.example.",
                },
            ]
        },
    )


def _respond_with_recording(requests: list[httpx.Request]):
    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.url.host == "api.usaspending.gov":
            return httpx.Response(200, content=json.dumps(RECORDED["response"]).encode("utf-8"))
        return _tavily_hits(request)

    return respond


def test_recorded_awards_become_a_uei_shortlist_ranked_by_award_count_then_amount() -> None:
    requests: list[httpx.Request] = []
    source = UsaSpendingTavilyDiscoverySource("", _client(_respond_with_recording(requests)))

    result = source.search([DEVSECOPS_QUERY])

    assert result.status == "ok"
    assert [provider.supplier_uei for provider in result.providers] == [
        "C47BNA8GM833",  # Accenture Federal: 4 awards (5 rows, one award returned twice)
        "N3PBJAVNKF61",  # CACI: 3 awards
        "MMLKPW9JLX64",  # then one award each, largest first
        "KHK6E1JW9C15",
        "DKJ1R5ABCN48",
        "TRKEP1HEBNS5",
    ]
    accenture = result.providers[0]
    assert accenture.provenance == "public_award"
    assert [record.kind for record in accenture.evidence] == ["usaspending_award"] * 4
    assert all(record.url and record.url.startswith("https://www.usaspending.gov/award/") for record in accenture.evidence)
    assert accenture.source_urls == [record.url for record in accenture.evidence]
    assert {request.url.host for request in requests} == {"api.usaspending.gov"}
    assert "place of performance VA" in (result.detail or "")
    assert "TAVILY_API_KEY is not configured" in (result.detail or "")
    assert "Subawards not searched" in (result.detail or "")


def test_enrichment_takes_details_from_the_first_non_directory_page_and_keeps_every_hit_as_name_search_evidence() -> None:
    requests: list[httpx.Request] = []
    source = UsaSpendingTavilyDiscoverySource("tvly-test-key", _client(_respond_with_recording(requests)))

    result = source.search([DEVSECOPS_QUERY])

    accenture = result.providers[0]
    assert accenture.website_url == "https://www.accenturefederal.example"
    assert accenture.contact_email == "federal@accenturefederal.example"
    assert accenture.contact_email_source_url == "https://www.accenturefederal.example/devsecops"
    web = [record for record in accenture.evidence if record.kind == "web_page"]
    assert [record.url for record in web] == [
        "https://www.linkedin.com/company/afs",
        "https://www.accenturefederal.example/devsecops",
    ]
    assert all(record.match_basis == "name_search" for record in web)
    assert "Web enrichment ran for all 6 suppliers" in (result.detail or "")
    # The award supplier survives the aggregator filter even though a directory page is in its evidence.
    assert drop_aggregators(result.providers).dropped_count == 0


def test_a_tavily_failure_keeps_the_award_suppliers_and_says_where_enrichment_stopped() -> None:
    calls = {"tavily": 0}

    def respond(request: httpx.Request) -> httpx.Response:
        if request.url.host == "api.usaspending.gov":
            return httpx.Response(200, content=json.dumps(RECORDED["response"]).encode("utf-8"))
        calls["tavily"] += 1
        return _tavily_hits(request) if calls["tavily"] == 1 else httpx.Response(429)

    result = UsaSpendingTavilyDiscoverySource("tvly-test-key", _client(respond)).search([DEVSECOPS_QUERY])

    assert result.status == "ok"
    assert len(result.providers) == 6
    assert result.providers[0].contact_email == "federal@accenturefederal.example"
    assert result.providers[1].website_url is None
    assert "Web enrichment stopped after 1 of 6 suppliers" in (result.detail or "")


def test_a_category_without_a_naics_mapping_is_not_run_and_calls_nothing() -> None:
    requests: list[httpx.Request] = []
    source = UsaSpendingTavilyDiscoverySource("tvly-test-key", _client(_respond_with_recording(requests)))

    result = source.search([DiscoveryQuery(text="unused", category="catering", service_area="Northern Virginia")])

    assert result.status == "unavailable"
    assert "catering" in (result.detail or "")
    assert result.providers == []
    assert requests == []


def test_a_usaspending_error_keeps_nothing() -> None:
    source = UsaSpendingTavilyDiscoverySource("", _client(lambda request: httpx.Response(503)))

    result = source.search([DEVSECOPS_QUERY])

    assert (result.status, result.providers) == ("error", [])
    assert "HTTP 503" in (result.detail or "")


def test_look_alike_names_with_different_ueis_stay_separate_candidates_and_reruns_add_no_duplicate_evidence(
    client, db_session
) -> None:
    listing = publish_cleaning_listing(db_session)
    searched: list[dict] = []

    def respond(request: httpx.Request) -> httpx.Response:
        searched.append(json.loads(request.content))
        return httpx.Response(
            200,
            json={
                "results": [
                    {"Award ID": "C-1", "Recipient Name": "Bay Clean LLC", "Recipient UEI": "UEIBAYONE001",
                     "Award Amount": 1000.10, "generated_internal_id": "CONT_AWD_C-1"},
                    {"Award ID": "C-2", "Recipient Name": "Bay Clean, Inc.", "Recipient UEI": "UEIBAYTWO002",
                     "Award Amount": 900, "generated_internal_id": "CONT_AWD_C-2"},
                    {"Award ID": "C-3", "Recipient Name": "Bay Clean", "Recipient UEI": None, "Award Amount": 50},
                ]
            },
        )

    source = UsaSpendingTavilyDiscoverySource("", _client(respond))
    first = run_discovery(listing.id, OWNER_ID, db_session, source)
    second = run_discovery(listing.id, OWNER_ID, db_session, source)

    # The cleaning listing searches janitorial awards, never the DevSecOps industry.
    assert searched[0]["filters"]["naics_codes"] == ["561720"]
    # "San Francisco Bay Area" names no state, so the search is nationwide and the run says so.
    assert "place_of_performance_locations" not in searched[0]["filters"]
    assert "all states" in (first.detail or "")
    assert (first.status, first.new_candidate_count, first.merged_duplicate_count) == ("ok", 2, 0)
    assert (second.status, second.new_candidate_count) == ("ok", 0)
    assert db_session.scalar(select(func.count()).select_from(ProviderCandidate)) == 2

    candidates = candidates_by_name(client, listing.id)
    assert set(candidates) == {"Bay Clean LLC", "Bay Clean, Inc."}
    bay_one = candidates["Bay Clean LLC"]
    assert bay_one["supplier_uei"] == "UEIBAYONE001"
    assert bay_one["provenance"] == "public_award"
    assert bay_one["discovery_source"] == "usaspending_tavily"
    assert [(record["kind"], record["award_id"], record["amount_minor"]) for record in bay_one["evidence"]] == [
        ("usaspending_award", "C-1", 100010)
    ]
    assert bay_one["source_urls"] == ["https://www.usaspending.gov/award/CONT_AWD_C-1"]
    assert bay_one["eligibility"] == {"can_invite": False, "reason": "No published contact email"}


def test_dedupe_never_merges_different_ueis_or_a_uei_with_an_unidentified_result() -> None:
    result = UsaSpendingTavilyDiscoverySource(
        "", _client(lambda request: httpx.Response(200, content=json.dumps(RECORDED["response"]).encode("utf-8")))
    ).search([DEVSECOPS_QUERY])
    web_twin = result.providers[0].model_copy(
        update={"supplier_uei": None, "evidence": [], "provenance": "public_web", "source_urls": ["https://afs.example"]}
    )
    duplicate = result.providers[0].model_copy()

    deduped = dedupe_providers([*result.providers, duplicate, web_twin])

    assert deduped.merged_count == 1
    assert [provider.supplier_uei for provider in deduped.kept].count(None) == 1
    assert len(deduped.kept[0].evidence) == 4


def test_the_overview_labels_the_usaspending_source(client, db_session, monkeypatch) -> None:
    listing = publish_cleaning_listing(db_session)
    monkeypatch.setenv("DISCOVERY_SOURCE", "usaspending_tavily")
    monkeypatch.setenv("TAVILY_API_KEY", "")
    get_settings.cache_clear()

    overview = client.get(f"/api/invitations/listings/{listing.id}", headers=OWNER_HEADERS).json()

    assert overview["discovery"]["source"]["name"] == "usaspending_tavily"
    assert "USAspending" in overview["discovery"]["source"]["label"]
    assert overview["discovery"]["source"]["available"] is True
