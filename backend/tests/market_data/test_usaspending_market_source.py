"""The live market-data source: USAspending prime awards and subawards become UEI-countable award records; rates stay
not checked. Recorded responses stand in for the API; no test calls it.
"""

import json
from pathlib import Path

import httpx

from app.services.market_data import LaborRateQuery, SupplierQuery, count_suppliers
from app.services.market_data.usaspending import UsaSpendingMarketDataSource

RECORDED_DIR = Path(__file__).parent / "recorded"
AWARDS = json.loads((RECORDED_DIR / "usaspending_awards_devsecops_va.json").read_text("utf-8"))
SUBAWARDS = json.loads((RECORDED_DIR / "usaspending_subawards_da01_va.json").read_text("utf-8"))
QUERY = SupplierQuery(psc="DA01", naics="541512", place_of_performance="Northern Virginia", lookback_years=5)


def _source(handler) -> UsaSpendingMarketDataSource:
    return UsaSpendingMarketDataSource(httpx.Client(transport=httpx.MockTransport(handler)))


def _recorded(requests: list[dict] | None = None, subaward_status: int = 200):
    def respond(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        if requests is not None:
            requests.append(body)
        if body["subawards"]:
            if subaward_status != 200:
                return httpx.Response(subaward_status)
            return httpx.Response(200, content=json.dumps(SUBAWARDS["response"]).encode("utf-8"))
        return httpx.Response(200, content=json.dumps(AWARDS["response"]).encode("utf-8"))

    return respond


def test_prime_awards_and_subawards_become_records_counted_by_uei() -> None:
    requests: list[dict] = []

    retrieval = _source(_recorded(requests)).find_suppliers(QUERY)

    assert (retrieval.source, retrieval.provenance, retrieval.status) == ("usaspending", "public_api", "ok")
    # One prime search and one subaward search, each with the segment's PSC and NAICS and its state.
    assert [body["subawards"] for body in requests] == [False, True]
    for body in requests:
        assert body["filters"]["psc_codes"] == ["DA01"]
        assert body["filters"]["naics_codes"] == ["541512"]
        assert body["filters"]["place_of_performance_locations"] == [{"country": "USA", "state": "VA"}]
    primes = [record for record in retrieval.records if record.award_type == "prime"]
    subawards = [record for record in retrieval.records if record.award_type == "subaward"]
    assert (len(primes), len(subawards)) == (11, 8)
    assert primes[0].amount_minor == 120593799776 and primes[0].currency == "USD"
    assert subawards[0].url == "https://www.usaspending.gov/award/CONT_AWD_FA460021F0056_9700_FA460021D0001_9700"
    count = count_suppliers(retrieval.records)
    # 6 prime UEIs and 7 subaward UEIs, with Accenture Federal in both lists.
    assert (count.distinct_uei_count, count.prime_award_count, count.subaward_count) == (12, 11, 8)
    assert "performed in VA" in retrieval.limitations
    assert "supplier counts are floors" in retrieval.limitations


def test_an_empty_search_is_no_match_not_unavailable() -> None:
    retrieval = _source(lambda request: httpx.Response(200, json={"results": []})).find_suppliers(QUERY)

    assert (retrieval.status, retrieval.records) == ("no_match", [])


def test_a_failed_prime_search_is_unavailable_and_keeps_nothing() -> None:
    retrieval = _source(lambda request: httpx.Response(500)).find_suppliers(QUERY)

    assert (retrieval.status, retrieval.records) == ("unavailable", [])
    assert retrieval.limitations.startswith("Not checked")
    assert "HTTP 500" in retrieval.limitations


def test_a_failed_subaward_search_keeps_the_prime_awards_and_says_subawards_were_not_checked() -> None:
    retrieval = _source(_recorded(subaward_status=429)).find_suppliers(QUERY)

    assert retrieval.status == "ok"
    assert {record.award_type for record in retrieval.records} == {"prime"}
    assert "Subawards not checked" in retrieval.limitations


def test_a_segment_without_classification_tags_is_not_checked_and_calls_nothing() -> None:
    requests: list[dict] = []

    retrieval = _source(_recorded(requests)).find_suppliers(
        SupplierQuery(psc=None, naics=None, place_of_performance="Northern Virginia", lookback_years=5)
    )

    assert retrieval.status == "unavailable"
    assert requests == []


def test_an_unreadable_place_searches_every_state_and_says_so() -> None:
    requests: list[dict] = []

    retrieval = _source(_recorded(requests)).find_suppliers(QUERY.model_copy(update={"place_of_performance": "Remote"}))

    assert all("place_of_performance_locations" not in body["filters"] for body in requests)
    assert 'in all states (no US state read from "Remote")' in retrieval.limitations


def test_labor_rates_are_reported_not_checked_and_never_demo_data() -> None:
    rates = _source(_recorded()).find_labor_rates(LaborRateQuery(labor_category="DevSecOps Engineer", place_of_performance=None))

    assert (rates.status, rates.provenance, rates.rates_minor_per_hour) == ("unavailable", "public_api", [])
    assert rates.limitations.startswith("Not checked")
