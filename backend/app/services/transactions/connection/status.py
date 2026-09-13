"""Summarizes one account's financial links and what has been imported through them.
Links come from the same records as the Stripe panel, and every count and label is read from the stored
transactions, so the summary describes the data rather than the config.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.services.transactions.connection.linked import LinkedConnection, list_linked_connections
from app.services.transactions.connection.sources import ImportedSource, count_imported_sources


class ConnectionSummary(BaseModel):
    """The owner-visible state of one account's financial connections."""

    status: Literal["not_connected", "connected_not_imported", "imported"]
    connections: list[LinkedConnection]
    sources: list[ImportedSource]
    transaction_count: int
    excluded_count: int
    # Distinct stored reasons (payroll, tax, transfer, and Stripe's pending or void), so the copy matches the rows.
    excluded_reasons: list[str]
    provenance: list[str]
    first_posted_at: datetime | None
    last_posted_at: datetime | None
    last_imported_at: datetime | None


def summarize_connection(account_id: str, transaction_source: str, db: Session) -> ConnectionSummary:
    """Return link state plus per-source counts, dates, exclusions, and provenance of the account's transactions."""

    connections = list_linked_connections(account_id, transaction_source, db)
    sources = count_imported_sources(account_id, connections, db)
    owned = Transaction.owner_account_id == account_id
    dates = db.execute(
        select(
            func.min(Transaction.posted_at),
            func.max(Transaction.posted_at),
            func.max(Transaction.created_at),
        ).where(owned)
    ).one()
    excluded_count = db.scalar(
        select(func.count(Transaction.id)).where(owned, Transaction.is_excluded.is_(True))
    )
    excluded_reasons = db.scalars(
        select(Transaction.excluded_reason)
        .where(owned, Transaction.is_excluded.is_(True), Transaction.excluded_reason.is_not(None))
        .distinct()
        .order_by(Transaction.excluded_reason)
    ).all()
    # Totals derive from the per-source counts so "28 from fixture, 3 from Stripe sandbox" always adds up.
    transaction_count = sum(source.transaction_count for source in sources)

    # Transactions can outlive a link (e.g. a deploy switched sources), so the stored data decides "imported"
    # and the links only decide whether the account is connected at all.
    if transaction_count > 0:
        status: Literal["not_connected", "connected_not_imported", "imported"] = "imported"
    elif connections:
        status = "connected_not_imported"
    else:
        status = "not_connected"

    return ConnectionSummary(
        status=status,
        connections=connections,
        sources=sources,
        transaction_count=transaction_count,
        excluded_count=int(excluded_count or 0),
        excluded_reasons=[reason for reason in excluded_reasons if reason is not None],
        provenance=sorted({source.source_type for source in sources}),
        first_posted_at=dates[0],
        last_posted_at=dates[1],
        last_imported_at=dates[2],
    )
