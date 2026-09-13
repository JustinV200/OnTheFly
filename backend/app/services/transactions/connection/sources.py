"""Counts one account's stored transactions per provider and provenance label.
Labels come from the rows themselves, never from TRANSACTION_SOURCE, so sandbox rows can't read as fixture data.
"""

from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.services.transactions.connection.linked import LinkedConnection


class ImportedSource(BaseModel):
    """How many of an account's stored transactions came from one provider under one provenance label."""

    provider: str
    source_type: str
    transaction_count: int
    # False when no live link to this provider exists now, e.g. fixture rows left after a deploy switched sources.
    is_connected: bool


def count_imported_sources(
    account_id: str, connections: list[LinkedConnection], db: Session
) -> list[ImportedSource]:
    """Return per provider and source_type counts, ordered by both. Empty when the account stores no transactions.

    connections must be the account's current live links; they only set is_connected.
    """

    connected_providers = {connection.provider for connection in connections}
    rows = db.execute(
        select(Transaction.provider, Transaction.source_type, func.count(Transaction.id))
        .where(Transaction.owner_account_id == account_id)
        .group_by(Transaction.provider, Transaction.source_type)
        .order_by(Transaction.provider, Transaction.source_type)
    ).all()
    return [
        ImportedSource(
            provider=provider,
            source_type=source_type,
            transaction_count=int(count),
            is_connected=provider in connected_providers,
        )
        for provider, source_type, count in rows
    ]
