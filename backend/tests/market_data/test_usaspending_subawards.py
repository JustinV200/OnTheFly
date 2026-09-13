"""Exercises the USAspending subaward search against a recorded response: the request flag, identity, cents and links.
recorded/usaspending_subawards_da01_va.json is a real response saved with its request and timestamp; no test calls the API.
"""

from datetime import date
import json
from pathlib import Path

import httpx
import pytest

from app.services.market_data.usaspending import AwardSearch, UsaSpendingClient, UsaSpendingError

RECORDED = json.loads((Path(__file__).parent / "recorded" / "usaspending_subawards_da01_va.json").read_text("utf-8"))
SEARCH = AwardSearch(
    psc_codes=["DA01"],
    place_of_performance_states=["VA"],
    start_date=date(2021, 9, 13),
    end_date=date(2026, 9, 13),
)


def _client(handler) -> httpx.Client:
    return httpx.Client(transport=httpx.MockTransport(handler))


def test_the_subaward_search_sends_the_subawards_flag_and_the_same_filters() -> None:
    requests: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, content=json.dumps(RECORDED["response"]).encode("utf-8"))

    UsaSpendingClient(_client(respond)).search_subawards(SEARCH)

    body = json.loads(requests[0].content)
    assert body["subawards"] is True
    assert body["sort"] == "Sub-Award Amount"
    assert body["filters"]["award_type_codes"] == ["A", "B", "C", "D"]
    assert body["filters"]["psc_codes"] == ["DA01"]
    assert "naics_codes" not in body["filters"]
    assert set(RECORDED["request"]["filters"]) == set(body["filters"])


def test_recorded_subawards_parse_with_uei_cents_and_the_prime_award_page() -> None:
    subawards = UsaSpendingClient(
        _client(lambda request: httpx.Response(200, content=json.dumps(RECORDED["response"]).encode("utf-8")))
    ).search_subawards(SEARCH)

    assert len(subawards) == 8
    first = subawards[0]
    assert first.subaward_id == "PO-0031046"
    assert first.subrecipient_uei == "MB2KUC9KA6C7"
    assert first.amount_minor == 83160324100
    assert first.subaward_date == date(2022, 1, 27)
    assert first.prime_award_id == "FA460021F0056"
    assert first.prime_recipient_name == "PERATON ENTERPRISE SOLUTIONS LLC"
    assert first.url == "https://www.usaspending.gov/award/CONT_AWD_FA460021F0056_9700_FA460021D0001_9700"
    # 47259351.06 in the JSON text lands on exact cents.
    assert 4725935106 in {subaward.amount_minor for subaward in subawards}
    # Accenture Federal appears as a subrecipient under two different primes.
    assert [subaward.subrecipient_uei for subaward in subawards].count("C47BNA8GM833") == 2


def test_the_same_subaward_number_under_different_primes_stays_two_subawards_and_repeats_collapse() -> None:
    row = {"Sub-Award ID": "1", "Sub-Awardee Name": "Sub B", "Sub-Recipient UEI": "subbuei00001", "Sub-Award Amount": 10}
    body = {
        "results": [
            {**row, "prime_award_generated_internal_id": "CONT_AWD_P1"},
            {**row, "prime_award_generated_internal_id": "CONT_AWD_P2"},
            {**row, "prime_award_generated_internal_id": "CONT_AWD_P1"},
            {"Sub-Award ID": "2", "Sub-Awardee Name": "", "prime_award_generated_internal_id": "CONT_AWD_P1"},
        ]
    }
    subawards = UsaSpendingClient(_client(lambda request: httpx.Response(200, json=body))).search_subawards(SEARCH)

    assert [(item.prime_generated_award_id, item.subrecipient_uei) for item in subawards] == [
        ("CONT_AWD_P1", "SUBBUEI00001"),
        ("CONT_AWD_P2", "SUBBUEI00001"),
    ]


def test_a_failed_subaward_search_raises_a_safe_error() -> None:
    with pytest.raises(UsaSpendingError, match="subaward search failed \\(HTTP 500\\)"):
        UsaSpendingClient(_client(lambda request: httpx.Response(500, text="secret body"))).search_subawards(SEARCH)
