"""Resolves which provider account a seeded demo business imports its transactions from.
Demo-only: there is no connection-management flow (CLAUDE.md, "No authentication work"), so the map is fixed here.
"""

from pydantic import BaseModel


class DemoConnection(BaseModel):
    """One account's link to a provider account in the active transaction source."""

    account_id: str
    provider: str
    provider_account_id: str


# Keyed by transaction source, then by platform account. Only the fixture source has fixed
# provider accounts. Stripe accounts are linked per company through the consent flow and stored
# as FinancialConnection rows (api/connections/router.py), so they don't appear in this map;
# linked.py reports both kinds of link side by side.
DEMO_CONNECTIONS: dict[str, dict[str, str]] = {
    "fixture": {
        "acc_owner_1": "fixture_apex_main",
        "acc_owner_2": "fixture_tidewater_main",
        # GovCon uses its own explicitly synthetic ledger. A separately linked Stripe sandbox
        # account may coexist with it, and the dashboard reports each source independently.
        "acc_govcon_1": "fixture_govcon_main",
    },
}


def get_connection(account_id: str, transaction_source: str) -> DemoConnection | None:
    """Return the account's connection for the active source, or None when it has none.

    The server decides the provider account. A client-supplied id would let one business
    import another business's transactions into its own dashboard.
    """

    provider_account_id = DEMO_CONNECTIONS.get(transaction_source, {}).get(account_id)
    if provider_account_id is None:
        return None
    return DemoConnection(
        account_id=account_id,
        provider=transaction_source,
        provider_account_id=provider_account_id,
    )
