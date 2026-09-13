"""Lists the live financial links one account has, read from the records both dashboard connection panels use.
A fixture link comes from the fixed demo map for the configured source. A Stripe link is a finished consent
(FinancialConnection with a bank account), whatever TRANSACTION_SOURCE says. Nothing here calls Stripe or imports.
"""

from typing import Literal

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.provenance import FinancialProvenance
from app.services.transactions.connection.resolve import get_connection
from app.services.transactions.stripe import connection as stripe_connection


class LinkedConnection(BaseModel):
    """One live link between an account and a provider account, as its owner sees it."""

    provider: str
    # None for Stripe: the bank account id stays on the backend (transactions/stripe/NOTES.md).
    provider_account_id: str | None
    provenance: FinancialProvenance
    # Which endpoint imports this link. A Stripe link imports only through the Stripe sync, which waits for
    # Stripe's refresh to succeed first; POST /api/connection/import never reads it.
    imported_through: Literal["connection_import", "stripe_sync"]


def has_stripe_link(account_id: str, db: Session) -> bool:
    """Return True when the account finished Stripe consent.

    Delegates to the Stripe panel's own state() so the two panels can never disagree about the link.
    """

    return stripe_connection.state(account_id, db).connected


def list_linked_connections(account_id: str, transaction_source: str, db: Session) -> list[LinkedConnection]:
    """Return the account's live links: the demo link for the configured source first, then the Stripe link.

    An empty list means the account has no connection at all.
    """

    links: list[LinkedConnection] = []

    demo = get_connection(account_id, transaction_source)
    if demo is not None:
        # DEMO_CONNECTIONS holds only fixture accounts (resolve.py), and FixtureSource labels every row fixture.
        links.append(
            LinkedConnection(
                provider=demo.provider,
                provider_account_id=demo.provider_account_id,
                provenance=FinancialProvenance.fixture,
                imported_through="connection_import",
            )
        )

    if has_stripe_link(account_id, db):
        # StripeClient refuses live keys and live responses, so a link here can only carry sandbox data.
        links.append(
            LinkedConnection(
                provider="stripe",
                provider_account_id=None,
                provenance=FinancialProvenance.sandbox,
                imported_through="stripe_sync",
            )
        )

    return links
