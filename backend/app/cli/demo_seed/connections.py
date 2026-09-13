"""Resolves the connections the demo seed imports from, for both the pre-drop check and the seed itself.
Sharing one resolver keeps the reset's up-front refusal and the seed's import from disagreeing about a source.
"""

from app.cli.demo_seed.demo_marketplace import DEMO_OWNER_ID, NEIGHBOR_OWNER_ID
from app.services.transactions.connection import DemoConnection, get_connection

# Both publishing businesses import in every scenario, in this order.
DEMO_IMPORTING_OWNER_IDS: tuple[str, ...] = (DEMO_OWNER_ID, NEIGHBOR_OWNER_ID)


class MissingDemoConnectionError(RuntimeError):
    """Raised when a demo owner has no connection under the requested transaction source."""

    def __init__(self, owner_ids: list[str], transaction_source: str) -> None:
        self.owner_ids = owner_ids
        self.transaction_source = transaction_source
        # Stripe accounts are linked per company through the consent flow, never through the fixed
        # demo map, so the only source the seed can import from is the fixture one.
        super().__init__(
            f"Transaction source '{transaction_source}' has no demo connection for {', '.join(owner_ids)}. "
            "The demo seed imports fixture data, so run it with TRANSACTION_SOURCE=fixture."
        )


def require_demo_connections(transaction_source: str) -> dict[str, DemoConnection]:
    """Return every importing demo owner's connection under the source, keyed by owner id in import order.

    Reads only settings-level data (the fixed demo map), never the database, so the reset can call it
    before dropping anything. Raises MissingDemoConnectionError naming every owner without a connection.
    """

    connections: dict[str, DemoConnection] = {}
    missing_owner_ids: list[str] = []
    for owner_id in DEMO_IMPORTING_OWNER_IDS:
        connection = get_connection(owner_id, transaction_source)
        if connection is None:
            missing_owner_ids.append(owner_id)
        else:
            connections[owner_id] = connection
    if missing_owner_ids:
        raise MissingDemoConnectionError(missing_owner_ids, transaction_source)
    return connections
