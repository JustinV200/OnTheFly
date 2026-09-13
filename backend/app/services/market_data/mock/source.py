"""The mock market-data source: deterministic, fictional suppliers and rates, labeled demo data on every result.
Active while MARKET_DATA_SOURCE=mock (roadmap open question 2). It never claims to be USAspending or GSA CALC+.
"""

from datetime import date, datetime, timezone
import json
from pathlib import Path

from app.services.market_data.source import (
    AwardRecord,
    LaborRateQuery,
    LaborRateRetrieval,
    SupplierQuery,
    SupplierRetrieval,
)

_DATA_PATH = Path(__file__).with_name("data.json")
_LIMITATIONS = (
    "Demo market data: fictional suppliers, UEIs, awards and rates for the hackathon simulator. "
    "Not retrieved from USAspending or GSA CALC+, and not evidence of any real market."
)


class MockMarketDataSource:
    """Serves the fixed demo data in data.json."""

    name = "demo_market_data"

    def __init__(self, data_path: Path = _DATA_PATH) -> None:
        self._data = json.loads(data_path.read_text(encoding="utf-8"))

    def find_suppliers(self, query: SupplierQuery) -> SupplierRetrieval:
        """Return the demo awards for the query's PSC; an unknown PSC is "no match found in this source"."""

        rows = self._data["suppliers_by_psc"].get((query.psc or "").upper(), [])
        records = [
            AwardRecord(
                award_id=row["award_id"],
                award_type=row["award_type"],
                recipient_name=row["recipient_name"],
                uei=row["uei"],
                amount_minor=row["amount_minor"],
                currency="USD",
                action_date=date.fromisoformat(row["action_date"]) if row.get("action_date") else None,
                # No link: a made-up award must never look like a real USAspending page.
                url=None,
            )
            for row in rows
            if _within_lookback(row.get("action_date"), query.lookback_years)
        ]
        return SupplierRetrieval(
            source=self.name,
            provenance="demo_data",
            status="ok" if records else "no_match",
            query=query,
            retrieved_at=datetime.now(timezone.utc),
            records=records,
            limitations=_LIMITATIONS,
        )

    def find_labor_rates(self, query: LaborRateQuery) -> LaborRateRetrieval:
        """Return the demo rate sample for the labor category; an unknown category is no match."""

        entry = self._data["rates_by_labor_category"].get(query.labor_category)
        return LaborRateRetrieval(
            source=self.name,
            provenance="demo_data",
            status="ok" if entry else "no_match",
            query=query,
            retrieved_at=datetime.now(timezone.utc),
            matched_labor_categories=list(entry["matched"]) if entry else [],
            rates_minor_per_hour=list(entry["rates_minor_per_hour"]) if entry else [],
            limitations=_LIMITATIONS,
        )


def _within_lookback(action_date: str | None, lookback_years: int) -> bool:
    # A record without a date can't be shown to fall inside the window, so it is left out rather than assumed in.
    if not action_date:
        return False
    parsed = date.fromisoformat(action_date)
    today = date.today()
    try:
        cutoff = today.replace(year=today.year - lookback_years)
    except ValueError:
        # 29 February minus whole years can land on a date that doesn't exist.
        cutoff = today.replace(year=today.year - lookback_years, day=28)
    return parsed >= cutoff
