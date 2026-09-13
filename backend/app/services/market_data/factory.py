"""Chooses the market-data source from MARKET_DATA_SOURCE. The only place a concrete source is constructed."""

from app.core.config import get_settings
from app.services.market_data.mock.source import MockMarketDataSource
from app.services.market_data.source import MarketDataSource
from app.services.market_data.usaspending import UsaSpendingMarketDataSource


class UnknownMarketDataSourceError(ValueError):
    """Raised for a MARKET_DATA_SOURCE value no implementation answers to."""


def build_market_data_source() -> MarketDataSource:
    """Return the configured source.

    "mock" (the default) serves labeled demo data with no network. "live" queries public USAspending prime awards and
    subawards for suppliers; it has no public labor-rate client yet, so rate queries report unavailable ("not checked")
    and never fall back to demo data. An unknown value fails loudly instead of quietly picking one.
    """

    source = get_settings().market_data_source.strip().casefold()
    if source == "mock":
        return MockMarketDataSource()
    if source == "live":
        return UsaSpendingMarketDataSource()
    raise UnknownMarketDataSourceError(f"Unknown MARKET_DATA_SOURCE '{source}'; use mock or live")
