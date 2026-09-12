"""Chooses the configured transaction source implementation.
The active source is controlled centrally by settings.transaction_source.
"""

from app.core.config import get_settings
from app.services.transactions.fixture.source import FixtureSource
from app.services.transactions.stripe.source import StripeFinancialConnectionsSource
from app.services.transactions.source import TransactionSource



def get_transaction_source() -> TransactionSource:
    """Return the configured transaction source implementation."""

    settings = get_settings()
    if settings.transaction_source == "fixture":
        # The fixture source is active by default so local work stays deterministic.
        return FixtureSource()
    if settings.transaction_source == "stripe":
        # Stripe Financial Connections is the sole external MVP source.
        return StripeFinancialConnectionsSource()
    raise ValueError(f"Unsupported transaction_source: {settings.transaction_source}")
