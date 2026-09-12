"""Thin routes for the sandbox connection and bounded client polling flow."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.expenses.schemas import TransactionResponse
from app.core.identity import require_acting_account_id
from app.db.session import get_db
from app.models import Transaction
from app.services.transactions.stripe import connection
from app.services.transactions.stripe.client import StripeError

router = APIRouter(prefix="/api/connections/stripe", tags=["connections"])
Database = Annotated[Session, Depends(get_db)]


@router.get("/transactions")
def transactions(request: Request, db: Database) -> list[TransactionResponse]:
    """Show the latest 100 imported rows, including pending payments and credits."""
    owner = require_acting_account_id(request)
    rows = db.scalars(
        select(Transaction)
        .where(Transaction.owner_account_id == owner, Transaction.provider == "stripe")
        .order_by(Transaction.posted_at.desc())
        .limit(100)
    ).all()
    return [
        TransactionResponse.model_validate(row, from_attributes=True) for row in rows
    ]


class CompleteRequest(BaseModel):
    session_id: str


class SessionResponse(BaseModel):
    id: str
    client_secret: str


@router.get("")
def status(request: Request, db: Database) -> connection.ConnectionState:
    """Return only the acting company's connection status."""
    return connection.state(require_acting_account_id(request), db)


@router.post("/session")
def session(request: Request, db: Database) -> SessionResponse:
    """Create a sandbox consent session."""
    try:
        result = connection.create_session(require_acting_account_id(request), db)
        return SessionResponse(id=result.id, client_secret=result.client_secret or "")
    except StripeError as exc:
        raise HTTPException(400, str(exc)) from exc


@router.post("/complete")
def complete(
    payload: CompleteRequest, request: Request, db: Database
) -> connection.ConnectionState:
    """Validate the completed session against server-side company ownership."""
    try:
        return connection.complete_session(
            require_acting_account_id(request), payload.session_id, db
        )
    except StripeError as exc:
        raise HTTPException(400, str(exc)) from exc


@router.post("/sync")
def sync(
    request: Request, db: Database, refresh: bool = False
) -> connection.ConnectionState:
    """Poll one refresh step without holding a server request open."""
    try:
        return connection.import_account(
            require_acting_account_id(request), db, refresh
        )
    except StripeError as exc:
        raise HTTPException(400, str(exc)) from exc
