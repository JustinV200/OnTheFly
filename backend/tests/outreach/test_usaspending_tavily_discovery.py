"""USAspending suppliers are UEI-deduped before Tavily enriches that shortlist."""

import httpx

from app.services.discovery.types import DiscoveryQuery
from app.services.discovery.usaspending.source import UsaSpendingTavilyDiscoverySource


def test_awards_are_grouped_by_uei_ranked_deterministically_and_keep_both_provenances() -> (
    None
):
    requests: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.url.host == "api.usaspending.gov":
            return httpx.Response(
                200,
                json={
                    "results": [
                        {
                            "Award ID": "A-2",
                            "Recipient Name": "Alpha Systems LLC",
                            "recipient_uei": "UEI-ALPHA",
                            "Award Amount": 50,
                            "NAICS": "541512",
                            "PSC": "R425",
                            "Awarding Agency": "DoD",
                        },
                        {
                            "Award ID": "A-1",
                            "Recipient Name": "Alpha Systems LLC",
                            "recipient_uei": "UEI-ALPHA",
                            "Award Amount": 10,
                            "NAICS": "541512",
                            "PSC": "R425",
                            "Awarding Agency": "DoD",
                        },
                        {
                            "Award ID": "B-1",
                            "Recipient Name": "Bravo Cyber",
                            "recipient_uei": "UEI-BRAVO",
                            "Award Amount": 999,
                            "NAICS": "541519",
                            "PSC": "R425",
                            "Awarding Agency": "DoD",
                        },
                    ]
                },
            )
        return httpx.Response(
            200,
            json={
                "results": [
                    {
                        "title": "Alpha Systems | DevSecOps",
                        "url": "https://alpha.example/capabilities",
                        "content": "DevSecOps engineering and ATO support.",
                    }
                ]
            },
        )

    source = UsaSpendingTavilyDiscoverySource(
        "tvly-test-key", httpx.Client(transport=httpx.MockTransport(respond))
    )
    result = source.search(
        [
            DiscoveryQuery(
                text="unused", category="devsecops", service_area="Northern Virginia"
            )
        ]
    )

    assert result.status == "ok"
    assert [provider.supplier_uei for provider in result.providers] == [
        "UEI-ALPHA",
        "UEI-BRAVO",
    ]
    alpha = result.providers[0]
    assert alpha.website_url == "https://alpha.example"
    assert [item["source"] for item in alpha.evidence].count("usaspending_award") == 2
    assert any(item["source"] == "tavily" for item in alpha.evidence)
    award = alpha.evidence[0]
    assert award["award_id"] == "A-2"
    assert award["supplier_uei"] == "UEI-ALPHA"
    assert award["naics"] == "541512"
    assert {request.url.host for request in requests} == {
        "api.usaspending.gov",
        "api.tavily.com",
    }


def test_missing_tavily_key_keeps_real_award_suppliers_and_reports_the_web_gap() -> (
    None
):
    source = UsaSpendingTavilyDiscoverySource(
        "",
        httpx.Client(
            transport=httpx.MockTransport(
                lambda _: httpx.Response(
                    200,
                    json={
                        "results": [
                            {
                                "Award ID": "A-1",
                                "Recipient Name": "Alpha",
                                "recipient_uei": "UEI-ALPHA",
                            }
                        ]
                    },
                )
            )
        ),
    )

    result = source.search(
        [
            DiscoveryQuery(
                text="unused", category="devsecops", service_area="Northern Virginia"
            )
        ]
    )

    assert result.status == "ok"
    assert result.providers[0].supplier_uei == "UEI-ALPHA"
    assert "TAVILY_API_KEY is not configured" in (result.detail or "")
