"""Owns the company-to-Stripe binding and resumable sandbox import workflow."""

from datetime import UTC, datetime
from uuid import uuid4

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Account, FinancialConnection

from .client import StripeClient, StripeError
from .schemas import BankAccount, ConnectionSession, Customer


class ConnectionState(BaseModel):
    connected: bool
    last_synced_at: datetime | None = None
    status: str = "not_connected"


def state(owner: str, db: Session) -> ConnectionState:
    """Read local status without calling Stripe on dashboard loads."""
    row = db.get(FinancialConnection, owner)
    return ConnectionState(
        connected=bool(row and row.bank_account_id),
        last_synced_at=row.last_synced_at if row else None,
        status="connected" if row and row.bank_account_id else "not_connected",
    )


def create_session(owner: str, db: Session) -> ConnectionSession:
    """Create a transaction-only session tied to this seeded company."""
    company = db.get(Account, owner)
    if company is None:
        raise StripeError("Unknown demo company.")
    row = db.get(FinancialConnection, owner)
    client = StripeClient()
    if row is None:
        customer = client.request(
            "POST",
            "customers",
            Customer,
            {"name": company.business_name},
            key=f"sandbox-company-{owner}",
        )
        row = FinancialConnection(owner_account_id=owner, customer_id=customer.id)
        db.add(row)
        db.commit()
    session = client.request(
        "POST",
        "financial_connections/sessions",
        ConnectionSession,
        {
            "account_holder[type]": "customer",
            "account_holder[customer]": row.customer_id,
            "permissions[]": "transactions",
            "prefetch[]": "transactions",
            "filters[account_subcategories][]": "checking",
        },
        key=str(uuid4()),
    )
    if session.account_holder.customer != row.customer_id or not session.client_secret:
        raise StripeError("Stripe session does not match this company.")
    row.session_id = session.id
    db.commit()
    return session


def complete_session(owner: str, session_id: str, db: Session) -> ConnectionState:
    """Use a server-retrieved session; never trust a client-supplied bank account ID."""
    row = db.get(FinancialConnection, owner)
    if row is None or row.session_id != session_id:
        raise StripeError("Connection session does not belong to this company.")
    session = StripeClient().request(
        "GET", f"financial_connections/sessions/{row.session_id}", ConnectionSession
    )
    if session.account_holder.customer != row.customer_id:
        raise StripeError("Connection session ownership mismatch.")
    if len(session.accounts.data) != 1 or session.accounts.has_more:
        raise StripeError("Select exactly one sandbox checking account and try again.")
    account = session.accounts.data[0]
    validate_account(row, account)
    existing = db.scalar(
        select(FinancialConnection).where(
            FinancialConnection.bank_account_id == account.id
        )
    )
    if existing is not None and existing.owner_account_id != owner:
        raise StripeError("This bank account is already connected to another company.")
    if row.bank_account_id and row.bank_account_id != account.id:
        raise StripeError("This demo company already has a different bank connected.")
    row.bank_account_id = account.id
    db.commit()
    return state(owner, db)


def validate_account(row: FinancialConnection, account: BankAccount) -> None:
    """Require active sandbox data and transaction consent on every import."""
    if account.account_holder.customer != row.customer_id:
        raise StripeError("Bank account does not belong to this company.")
    if account.status != "active" or "transactions" not in account.permissions:
        raise StripeError(
            "Account is inactive or transaction consent is missing. Reconnect it."
        )


def import_account(owner: str, db: Session, refresh: bool = False) -> ConnectionState:
    """One short polling step: start refresh or import only after success."""
    from app.services.transactions.import_run import run_import

    from .source import StripeFinancialConnectionsSource

    row = db.get(FinancialConnection, owner)
    if row is None or not row.bank_account_id:
        raise StripeError("Connect a sandbox account first.")
    account = StripeClient().request(
        "GET", f"financial_connections/accounts/{row.bank_account_id}", BankAccount
    )
    validate_account(row, account)
    progress = account.transaction_refresh
    now = datetime.now(UTC)
    if refresh and progress and progress.status != "pending":
        available = progress.next_refresh_available_at
        if available is not None and available <= now.timestamp():
            account = StripeClient().request(
                "POST",
                f"financial_connections/accounts/{row.bank_account_id}/refresh",
                BankAccount,
                {"features[]": "transactions"},
            )
            progress = account.transaction_refresh
    if progress is None or progress.status == "failed":
        raise StripeError(
            "Stripe transaction refresh failed or has not started. Retry refresh or reconnect."
        )
    if progress.status == "pending":
        return ConnectionState(
            connected=True, status="pending", last_synced_at=row.last_synced_at
        )
    run_import(
        owner, row.bank_account_id, db, source=StripeFinancialConnectionsSource()
    )
    row.last_synced_at = now
    db.commit()
    return ConnectionState(connected=True, status="succeeded", last_synced_at=now)
