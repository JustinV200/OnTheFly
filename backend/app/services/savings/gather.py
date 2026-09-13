"""Gathers one segment's card inputs: the owner's rate, and fresh market evidence recorded as MarketEvidence rows.
Each call queries the configured source anew (roadmap open question 3: live calls, no saved snapshot to replay).
"""

from sqlalchemy.orm import Session

from app.models.listing import ScopeVersion
from app.models.tasks import Task
from app.services.market_data import (
    LaborRateQuery,
    MarketDataSource,
    SupplierQuery,
    count_suppliers,
    rate_percentiles,
    record_rate_retrieval,
    record_supplier_retrieval,
)
from app.services.rates import find_rate, rate_kind_for
from app.services.savings.inputs import CardInputs, CardRequirement, CutBasis, RateBasis, SupplierBasis
from app.services.savings.segments import Segment
from app.services.savings.thresholds import SavingsThresholds


def gather_inputs(
    task: Task,
    account_id: str,
    scope: ScopeVersion,
    segment: Segment,
    remainder_minor: int | None,
    constraint_kinds: list[str],
    source: MarketDataSource,
    thresholds: SavingsThresholds,
    db: Session,
) -> tuple[CardInputs, list[str]]:
    """Return the segment's inputs and the ids of the evidence rows recorded for it."""

    place = scope.service_area or scope.location_approximate
    suppliers = source.find_suppliers(
        SupplierQuery(psc=segment.psc, naics=segment.naics, place_of_performance=place, lookback_years=thresholds.lookback_years)
    )
    rates = source.find_labor_rates(LaborRateQuery(labor_category=segment.labor_category, place_of_performance=place))
    supplier_row = record_supplier_retrieval(task.id, suppliers, db)
    rate_row = record_rate_retrieval(task.id, rates, db)
    db.flush()

    percentiles = rate_percentiles(rates.rates_minor_per_hour) if rates.status == "ok" else None
    own_rate = find_rate(task, account_id, segment.labor_category, task.currency, db)
    inputs = CardInputs(
        segment_key=segment.key,
        labor_category=segment.labor_category,
        psc=segment.psc,
        naics=segment.naics,
        requirements=[
            CardRequirement(key=row.requirement_key, text=row.text, hours=row.hours_estimate, hours_status=row.hours_status)
            for row in segment.requirements
        ],
        rate=RateBasis(
            labor_category=segment.labor_category,
            kind=rate_kind_for(task, account_id).value,
            rate_minor_per_hour=own_rate.rate_minor_per_hour if own_rate else None,
            provenance=own_rate.provenance if own_rate else None,
            effective_date=own_rate.effective_date if own_rate else None,
        ),
        cut_basis=CutBasis(
            source=rates.source,
            provenance=rates.provenance,
            status=rates.status,
            retrieved_at=rates.retrieved_at,
            matched_labor_categories=rates.matched_labor_categories,
            p25_minor=percentiles.p25_minor if percentiles else None,
            median_minor=percentiles.median_minor if percentiles else None,
            p75_minor=percentiles.p75_minor if percentiles else None,
            sample_size=percentiles.sample_size if percentiles else 0,
            limitations=rates.limitations,
        ),
        suppliers=SupplierBasis(
            source=suppliers.source,
            provenance=suppliers.provenance,
            status=suppliers.status,
            retrieved_at=suppliers.retrieved_at,
            psc=segment.psc,
            naics=segment.naics,
            place_of_performance=place,
            lookback_years=thresholds.lookback_years,
            count=count_suppliers(suppliers.records),
            awards=suppliers.records,
            limitations=suppliers.limitations,
        ),
        remainder_minor=remainder_minor,
        constraint_kinds=constraint_kinds,
    )
    return inputs, [supplier_row.id, rate_row.id]
