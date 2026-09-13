"""Market evidence (roadmap 12, step 8): the source interface, the active source, UEI dedupe and rate percentiles."""

from app.services.market_data.factory import build_market_data_source
from app.services.market_data.percentiles import RatePercentiles, rate_percentiles
from app.services.market_data.record import record_rate_retrieval, record_supplier_retrieval
from app.services.market_data.source import (
    AwardRecord,
    LaborRateQuery,
    LaborRateRetrieval,
    MarketDataSource,
    SupplierQuery,
    SupplierRetrieval,
)
from app.services.market_data.suppliers import SupplierCount, count_suppliers

__all__ = [
    "AwardRecord",
    "LaborRateQuery",
    "LaborRateRetrieval",
    "MarketDataSource",
    "RatePercentiles",
    "SupplierCount",
    "SupplierQuery",
    "SupplierRetrieval",
    "build_market_data_source",
    "count_suppliers",
    "rate_percentiles",
    "record_rate_retrieval",
    "record_supplier_retrieval",
]
