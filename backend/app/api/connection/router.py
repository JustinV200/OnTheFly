"""Serves the acting account's connection state and runs its import.
The server resolves which provider account to read; the request body never chooses it.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.connection.schemas import ImportResultResponse
from app.core.config import get_settings
from app.core.identity import require_acting_account_id
from app.db.session import get_db
from app.services.transactions.connection import ConnectionSummary, get_connection, summarize_connection
from app.services.transactions.import_run import run_import

router = APIRouter(prefix="/api/connection", tags=["connection"])


@router.get("", response_model=ConnectionSummary)
def get_connection_status(request: Request, db: Session = Depends(get_db)) -> ConnectionSummary:
    """Return whether the acting account is connected and what it has imported."""

    account_id = require_acting_account_id(request)
    return summarize_connection(account_id, get_settings().transaction_source, db)


@router.post("/import", response_model=ImportResultResponse, status_code=202)
def trigger_import(request: Request, db: Session = Depends(get_db)) -> ImportResultResponse:
    """Import from the acting account's own connection and return the counts.

    Synchronous at MVP scale. Everything it imports lands private (CLAUDE.md, visibility).
    """

    account_id = require_acting_account_id(request)
    transaction_source = get_settings().transaction_source
    connection = get_connection(account_id, transaction_source)
    if connection is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This business has no financial connection, so there is nothing to import.",
        )

    try:
        result = run_import(account_id, connection.provider_account_id, db)
    except NotImplementedError as error:
        # The Rho adapter raises until its endpoints are verified; say that plainly rather
        # than returning zero counts that look like an empty but successful import.
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"The {transaction_source} transaction source is unavailable: {error}",
        ) from error

    return ImportResultResponse(
        new=result.new,
        duplicate=result.duplicate,
        excluded=result.excluded,
        failed=result.failed,
    )
