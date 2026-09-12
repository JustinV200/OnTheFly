"""Stubs the Rho transaction source behind the shared provider interface.
This file documents the integration boundary but does not ship live calls yet.
"""

from datetime import date

from app.core.config import get_settings
from app.services.transactions.source import NormalizedTransaction, TransactionSource


class RhoSource(TransactionSource):
    """Placeholder transaction source for the future Rho integration."""

    def list_transactions(
        self,
        provider_account_id: str,
        since: date,
        until: date,
    ) -> list[NormalizedTransaction]:
        """Raise until verified Rho credentials and endpoints are configured."""

        settings = get_settings()
        if not settings.rho_api_key:
            raise NotImplementedError("Rho API credentials not configured")

        # TODO(Copilot): Verify the real Rho transaction endpoint, pagination, and auth.
        raise NotImplementedError(
            "Rho API integration is not implemented yet for provider account "
            f"{provider_account_id} between {since} and {until}",
        )
