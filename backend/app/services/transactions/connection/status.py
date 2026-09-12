"""Summarizes one account's connection and what has been imported through it.
The provenance list is read from the stored transactions, so the label describes the data rather than the config.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.services.transactions.connection.resolve import get_connection


class ConnectionSummary(BaseModel):
    """The owner-visible state of one account's financial connection."""

    status: Literal["not_connected", "connected_not_imported", "imported"]
    provider: str | None
    provider_account_id: str | None
    transaction_count: int
    excluded_count: int
    provenance: list[str]
    first_posted_at: datetime | None
    last_posted_at: datetime | None
    last_imported_at: datetime | None


def summarize_connection(account_id: str, transaction_source: str, db: Session) -> ConnectionSummary:
    """Return connection state plus counts, dates, and provenance of the account's transactions."""

    connection = get_connection(account_id, transaction_source)
    owned = Transaction.owner_account_id == account_id
    counts = db.execute(
        select(
            func.count(Transaction.id),
            func.min(Transaction.posted_at),
            func.max(Transaction.posted_at),
            func.max(Transaction.created_at),
        ).where(owned)
    ).one()
    excluded_count = db.scalar(
        select(func.count(Transaction.id)).where(owned, Transaction.is_excluded.is_(True))
    )
    provenance = sorted(db.scalars(select(Transaction.source_type).where(owned).distinct()).all())
    transaction_count = int(counts[0] or 0)

    # Transactions can outlive a connection (e.g. a deploy switched sources), so the stored data
    # decides "imported" and the connection only decides whether an import can run.
    if transaction_count > 0:
        status: Literal["not_connected", "connected_not_imported", "imported"] = "imported"
    elif connection is not None:
        status = "connected_not_imported"
    else:
        status = "not_connected"

    return ConnectionSummary(
        status=status,
        provider=connection.provider if connection else None,
        provider_account_id=connection.provider_account_id if connection else None,
        transaction_count=transaction_count,
        excluded_count=int(excluded_count or 0),
        provenance=provenance,
        first_posted_at=counts[1],
        last_posted_at=counts[2],
        last_imported_at=counts[3],
    )
