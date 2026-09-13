"""Chooses the market-data source from MARKET_DATA_SOURCE. The only place a concrete source is constructed."""

from app.core.config import get_settings
from app.services.market_data.mock.source import MockMarketDataSource
from app.services.market_data.source import MarketDataSource
from app.services.market_data.unwired_live import UnwiredLiveMarketDataSource


class UnknownMarketDataSourceError(ValueError):
    """Raised for a MARKET_DATA_SOURCE value no implementation answers to."""


def build_market_data_source() -> MarketDataSource:
    """Return the configured source.

    "mock" (the default) serves labeled demo data; "live" is the slot the public-data branch fills, and until then
    reports every query unavailable. An unknown value fails loudly instead of quietly picking one.
    """

    source = get_settings().market_data_source.strip().casefold()
    if source == "mock":
        return MockMarketDataSource()
    if source == "live":
        return UnwiredLiveMarketDataSource()
    raise UnknownMarketDataSourceError(f"Unknown MARKET_DATA_SOURCE '{source}'; use mock or live")
