"""The live market-data slot before its clients exist: every query reports "unavailable", which renders "not checked".
The public USAspending and labor-rate clients are being built on another branch (roadmap open question 3: live calls
only); they replace this class at the factory. It never falls back to demo data.
"""

from datetime import datetime, timezone

from app.services.market_data.source import LaborRateQuery, LaborRateRetrieval, SupplierQuery, SupplierRetrieval

_LIMITATION = (
    "Not checked: MARKET_DATA_SOURCE=live, but the live USAspending and public labor-rate clients aren't wired into "
    "this build yet. No source was queried."
)


class UnwiredLiveMarketDataSource:
    """Answers every query as unavailable."""

    name = "live_market_data_unwired"

    def find_suppliers(self, query: SupplierQuery) -> SupplierRetrieval:
        """Return an unavailable award retrieval."""

        return SupplierRetrieval(
            source=self.name,
            provenance="public_api",
            status="unavailable",
            query=query,
            retrieved_at=datetime.now(timezone.utc),
            records=[],
            limitations=_LIMITATION,
        )

    def find_labor_rates(self, query: LaborRateQuery) -> LaborRateRetrieval:
        """Return an unavailable labor-rate retrieval."""

        return LaborRateRetrieval(
            source=self.name,
            provenance="public_api",
            status="unavailable",
            query=query,
            retrieved_at=datetime.now(timezone.utc),
            matched_labor_categories=[],
            rates_minor_per_hour=[],
            limitations=_LIMITATION,
        )
