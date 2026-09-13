"""Exercises the USAspending prime award search against a recorded response: the request, exact cents, and failures.
recorded/usaspending_awards_devsecops_va.json is a real response saved with its request and timestamp; no test calls the API.
"""

from datetime import date
import json
from pathlib import Path

import httpx
import pytest

from app.services.market_data.usaspending import AwardSearch, UsaSpendingClient, UsaSpendingError, states_in_area

RECORDED = json.loads((Path(__file__).parent / "recorded" / "usaspending_awards_devsecops_va.json").read_text("utf-8"))
SEARCH = AwardSearch(
    naics_codes=["541512", "541519"],
    place_of_performance_states=["VA"],
    start_date=date(2021, 9, 13),
    end_date=date(2026, 9, 13),
)


def _client(handler) -> httpx.Client:
    return httpx.Client(transport=httpx.MockTransport(handler))


def _recorded_response(request: httpx.Request) -> httpx.Response:
    # Serve the recorded body byte-for-byte as JSON text, so float amounts go through the client's own parsing.
    return httpx.Response(200, content=json.dumps(RECORDED["response"]).encode("utf-8"))


def test_the_request_carries_the_award_type_group_the_endpoint_requires() -> None:
    requests: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return _recorded_response(request)

    UsaSpendingClient(_client(respond)).search_awards(SEARCH)

    body = json.loads(requests[0].content)
    assert requests[0].url.host == "api.usaspending.gov"
    # Without award_type_codes the live endpoint answers HTTP 422.
    assert body["filters"]["award_type_codes"] == ["A", "B", "C", "D"]
    assert body["filters"]["naics_codes"] == ["541512", "541519"]
    assert body["filters"]["place_of_performance_locations"] == [{"country": "USA", "state": "VA"}]
    assert body["filters"]["time_period"] == [{"start_date": "2021-09-13", "end_date": "2026-09-13"}]
    assert "psc_codes" not in body["filters"]
    assert body["subawards"] is False
    assert set(RECORDED["request"]["filters"]) == set(body["filters"])


def test_a_search_without_any_classification_code_is_rejected() -> None:
    # It would otherwise ask for every federal contract in the window.
    with pytest.raises(ValueError, match="NAICS or PSC"):
        AwardSearch(start_date=date(2021, 9, 13), end_date=date(2026, 9, 13))


def test_recorded_awards_parse_into_exact_cents_codes_and_award_page_links() -> None:
    awards = UsaSpendingClient(_client(_recorded_response)).search_awards(SEARCH)

    assert len(RECORDED["response"]["results"]) == 12
    assert len(awards) == 11
    first = awards[0]
    assert first.award_id == "47QFCA21F0001"
    assert first.generated_award_id == "CONT_AWD_47QFCA21F0001_4732_47QTCK18D0001_4732"
    assert first.recipient_uei == "MMLKPW9JLX64"
    assert first.amount_minor == 120593799776
    assert first.naics_code == "541512"
    assert first.psc_code == "DA01"
    assert first.place_of_performance_state == "VA"
    assert first.start_date == date(2020, 11, 30)
    assert first.url == "https://www.usaspending.gov/award/CONT_AWD_47QFCA21F0001_4732_47QTCK18D0001_4732"
    assert all(isinstance(award.amount_minor, int) for award in awards)


def test_an_award_returned_twice_is_kept_once_as_its_most_recently_loaded_row() -> None:
    awards = UsaSpendingClient(_client(_recorded_response)).search_awards(SEARCH)

    # The recording holds W52P1J20C0005 twice under one generated award id, with different amounts.
    repeated = [award for award in awards if award.award_id == "W52P1J20C0005"]
    assert len(repeated) == 1
    # internal_id 361850674 (loaded later) over 349009952. 885483827.6 in the JSON text: exact cents via Decimal.
    assert repeated[0].amount_minor == 88548382760


def test_the_same_piid_under_different_parent_contracts_stays_two_awards() -> None:
    body = {
        "results": [
            {"Award ID": "T-1", "Recipient Name": "A", "generated_internal_id": "CONT_AWD_T-1_1_P-1_1", "internal_id": 1},
            {"Award ID": "T-1", "Recipient Name": "A", "generated_internal_id": "CONT_AWD_T-1_1_P-2_1", "internal_id": 2},
        ]
    }
    awards = UsaSpendingClient(_client(lambda request: httpx.Response(200, json=body))).search_awards(SEARCH)

    assert [award.generated_award_id for award in awards] == ["CONT_AWD_T-1_1_P-1_1", "CONT_AWD_T-1_1_P-2_1"]


def test_rows_missing_an_award_id_or_name_are_dropped_and_a_missing_uei_stays_none() -> None:
    body = {
        "results": [
            {"Award ID": "X-1", "Recipient Name": "No UEI Corp", "Recipient UEI": None, "Award Amount": 5},
            {"Award ID": "", "Recipient Name": "Uncitable Corp", "Recipient UEI": "ABC"},
            {"Award ID": "X-2", "Recipient Name": " ", "Recipient UEI": "DEF"},
        ]
    }
    awards = UsaSpendingClient(_client(lambda request: httpx.Response(200, json=body))).search_awards(SEARCH)

    assert [(award.award_id, award.recipient_uei, award.amount_minor, award.url) for award in awards] == [
        ("X-1", None, 500, None)
    ]


@pytest.mark.parametrize(
    ("response", "message"),
    [
        (httpx.Response(422, json={"detail": "Missing value"}), "HTTP 422"),
        (httpx.Response(429), "rate limit"),
        (httpx.Response(200, json={"unexpected": []}), "unexpected response shape"),
        (httpx.Response(200, content=b"not json"), "unexpected response shape"),
    ],
)
def test_failures_raise_a_safe_error(response: httpx.Response, message: str) -> None:
    with pytest.raises(UsaSpendingError, match=message):
        UsaSpendingClient(_client(lambda request: response)).search_awards(SEARCH)


def test_a_timeout_raises_a_safe_error() -> None:
    def time_out(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("slow", request=request)

    with pytest.raises(UsaSpendingError, match="timed out"):
        UsaSpendingClient(_client(time_out)).search_awards(SEARCH)


@pytest.mark.parametrize(
    ("area", "states"),
    [
        ("Northern Virginia", ["VA"]),
        ("Arlington, VA", ["VA"]),
        ("West Virginia", ["WV"]),
        ("Washington, DC metro", ["DC"]),
        ("Washington, D.C.", ["DC"]),
        ("Seattle, Washington", ["WA"]),
        ("DC, Maryland and Virginia", ["DC", "MD", "VA"]),
        # The old substring check read " va" inside "Valley" as Virginia.
        ("Silicon Valley", []),
        ("San Francisco Bay Area", []),
        ("work in or near town", []),
    ],
)
def test_states_are_read_only_from_whole_names_and_upper_case_codes(area: str, states: list[str]) -> None:
    assert states_in_area(area) == states
