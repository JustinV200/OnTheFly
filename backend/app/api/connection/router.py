"""Serves the acting account's connection state and runs its demo-connection import.
The server resolves which provider account to read; the request body never chooses it. Stripe links are
reported here but import through api/connections (the Stripe sync), which waits for Stripe's refresh.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.connection.schemas import ImportResultResponse
from app.core.config import get_settings
from app.core.identity import require_acting_account_id
from app.db.session import get_db
from app.services.transactions.connection import (
    ConnectionSummary,
    get_connection,
    has_stripe_link,
    summarize_connection,
)
from app.services.transactions.import_run import run_import
from app.services.transactions.stripe.client import StripeError

router = APIRouter(prefix="/api/connection", tags=["connection"])


@router.get("", response_model=ConnectionSummary)
def get_connection_status(request: Request, db: Session = Depends(get_db)) -> ConnectionSummary:
    """Return the acting account's live links and what it has imported, counted per stored provider."""

    account_id = require_acting_account_id(request)
    return summarize_connection(account_id, get_settings().transaction_source, db)


@router.post("/import", response_model=ImportResultResponse, status_code=202)
def trigger_import(request: Request, db: Session = Depends(get_db)) -> ImportResultResponse:
    """Import from the acting account's demo connection for the configured source and return the counts.

    Synchronous at MVP scale. Everything it imports lands private (CLAUDE.md, visibility). A Stripe-linked
    account without a demo connection is refused rather than handed fixture data it never connected.
    """

    account_id = require_acting_account_id(request)
    transaction_source = get_settings().transaction_source
    connection = get_connection(account_id, transaction_source)
    if connection is None:
        if has_stripe_link(account_id, db):
            detail = (
                "This business is linked through Stripe sandbox. Its transactions import from the Stripe panel "
                "(Refresh transactions), not from this import."
            )
        else:
            detail = "This business has no financial connection, so there is nothing to import."
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

    try:
        result = run_import(account_id, connection.provider_account_id, db)
    except NotImplementedError as error:
        # Defensive: a source that is not implemented yet must say so plainly rather than return zero
        # counts that look like an empty but successful import.
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"The {transaction_source} transaction source is unavailable: {error}",
        ) from error
    except StripeError as error:
        # run_import raises StripeError for refused records, such as a provider record another business
        # already owns. Its messages are written to be shown; roll back so nothing half-imported survives.
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

    return ImportResultResponse(
        new=result.new,
        duplicate=result.duplicate,
        excluded=result.excluded,
        failed=result.failed,
    )
