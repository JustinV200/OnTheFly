"""Roadmap 12, step 8: supplier counts by UEI only, integer rate percentiles, and honest no-match and unavailable states.
Recorded (fixture) responses stand in for live calls; the live client slot is filled by the public-data branch.
"""

from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.savings import MarketEvidence
from app.services.market_data import AwardRecord, LaborRateQuery, SupplierQuery, count_suppliers, rate_percentiles
from app.services.market_data.mock.source import MockMarketDataSource
from tests.tasks.support import PRIME_A, headers, stage


def _award(award_id: str, uei: str | None, name: str = "Same Name LLC") -> AwardRecord:
    return AwardRecord(
        award_id=award_id, award_type="prime", recipient_name=name, uei=uei, amount_minor=100, currency="USD", action_date=date(2025, 1, 1), url=None
    )


def test_suppliers_are_counted_by_uei_never_by_name() -> None:
    records = [
        _award("A1", "ABC123DEF456"),
        _award("A2", "abc123def456 "),  # the same UEI, differently spelled
        _award("A3", "ZZZ999YYY888"),  # the same name, a different UEI
        _award("A4", None),  # listed, never counted
        _award("A5", "  "),
    ]

    count = count_suppliers(records)

    assert count.distinct_uei_count == 2
    assert count.award_count == 5
    assert count.records_without_uei == 2


def test_rate_percentiles_are_integer_minor_units() -> None:
    odd = rate_percentiles([11900, 13200, 13800, 14600, 15200, 16000, 16900, 17800, 19100])
    even = rate_percentiles([10000, 10001, 10003, 10010])

    assert odd is not None and (odd.p25_minor, odd.median_minor, odd.p75_minor, odd.sample_size) == (13800, 15200, 16900, 9)
    # Linear interpolation, rounded once half up: 10000.75 → 10001, 10002 → 10002, 10004.75 → 10005.
    assert even is not None and (even.p25_minor, even.median_minor, even.p75_minor) == (10001, 10002, 10005)
    assert rate_percentiles([]) is None


def test_mock_source_reports_no_match_for_an_unknown_classification() -> None:
    source = MockMarketDataSource()

    suppliers = source.find_suppliers(SupplierQuery(psc="Z999", naics="000000", place_of_performance=None, lookback_years=5))
    rates = source.find_labor_rates(LaborRateQuery(labor_category="Astronaut", place_of_performance=None))

    assert suppliers.status == rates.status == "no_match"
    assert suppliers.provenance == "demo_data"
    assert suppliers.records == [] and rates.rates_minor_per_hour == []


def test_mock_source_labels_demo_data_and_never_links_to_a_real_award() -> None:
    suppliers = MockMarketDataSource().find_suppliers(SupplierQuery(psc="DJ01", naics="541512", place_of_performance="Northern Virginia", lookback_years=5))

    assert suppliers.status == "ok"
    assert "Not retrieved from USAspending" in suppliers.limitations
    assert all(record.url is None for record in suppliers.records)
    assert count_suppliers(suppliers.records).distinct_uei_count == 5


def test_unavailable_source_renders_not_checked_and_never_suggests(
    client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    chain = stage(db_session, "prime_owns")
    monkeypatch.setenv("MARKET_DATA_SOURCE", "live")
    get_settings.cache_clear()

    body = client.post(f"/api/tasks/{chain.rebid_task_id}/ways-to-save/refresh", headers=headers(PRIME_A)).json()

    assert body["market_data_source"] == "live_market_data_unwired"
    assert body["cards"]
    for card in body["cards"]:
        assert card["tier"] == "not_viable"
        assert "Award and subaward suppliers" in card["sources_not_checked"]
        assert "Public labor rates" in card["sources_not_checked"]
    evidence = db_session.scalars(select(MarketEvidence).where(MarketEvidence.task_id == chain.rebid_task_id)).all()
    assert {row.status for row in evidence if row.source == "live_market_data_unwired"} == {"unavailable"}
    assert all(row.limitations.startswith("Not checked") for row in evidence if row.source == "live_market_data_unwired")


def test_every_retrieval_is_recorded_with_source_query_time_and_status(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_owns")

    client.get(f"/api/tasks/{chain.rebid_task_id}/ways-to-save", headers=headers(PRIME_A))

    rows = db_session.scalars(select(MarketEvidence).where(MarketEvidence.task_id == chain.rebid_task_id)).all()
    assert len(rows) == 8  # suppliers + rates for each of the four segments
    assert {row.kind for row in rows} == {"suppliers", "labor_rates"}
    assert all(row.retrieved_at is not None and row.query_json and row.limitations for row in rows)
