"""Builds CardInputs for unit tests of costs and viability without touching the database or a market-data source."""

from datetime import datetime, timezone

from app.services.market_data import SupplierCount
from app.services.savings.inputs import CardInputs, CardRequirement, CutBasis, RateBasis, SupplierBasis


def card_inputs(
    hours: tuple[int | None, ...] = (1000,),
    rate_minor: int | None = 10_000,
    median_minor: int | None = 8_000,
    distinct_suppliers: int = 3,
    supplier_status: str = "ok",
    rate_status: str = "ok",
    remainder_minor: int | None = 1_000_000_000,
    hours_status: str = "confirmed",
) -> CardInputs:
    """Return one segment's inputs with every figure chosen by the caller."""

    now = datetime(2026, 9, 13, tzinfo=timezone.utc)
    return CardInputs(
        segment_key="Security Compliance Analyst|DJ01|541512",
        labor_category="Security Compliance Analyst",
        psc="DJ01",
        naics="541512",
        requirements=[
            CardRequirement(key=f"req_{index}", text=f"Requirement {index}", hours=value, hours_status=hours_status)
            for index, value in enumerate(hours)
        ],
        rate=RateBasis(
            labor_category="Security Compliance Analyst",
            kind="internal_cost",
            rate_minor_per_hour=rate_minor,
            provenance="fixture" if rate_minor is not None else None,
            effective_date=None,
        ),
        cut_basis=CutBasis(
            source="test",
            provenance="demo_data",
            status=rate_status,
            retrieved_at=now,
            matched_labor_categories=[],
            p25_minor=median_minor,
            median_minor=median_minor,
            p75_minor=median_minor,
            sample_size=1 if median_minor is not None else 0,
            limitations="test",
        ),
        suppliers=SupplierBasis(
            source="test",
            provenance="demo_data",
            status=supplier_status,
            retrieved_at=now,
            psc="DJ01",
            naics="541512",
            place_of_performance=None,
            lookback_years=5,
            count=SupplierCount(
                distinct_uei_count=distinct_suppliers,
                award_count=distinct_suppliers,
                records_without_uei=0,
                prime_award_count=distinct_suppliers,
                subaward_count=0,
            ),
            awards=[],
            limitations="test",
        ),
        remainder_minor=remainder_minor,
        constraint_kinds=[],
    )
