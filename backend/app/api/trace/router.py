"""Serves the owner-only trace from a savings figure down to its transactions (roadmap 09, step 9).
The response model lives with the service, like listings' PublicListingProjection.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.identity import require_acting_account_id
from app.db.session import get_db
from app.services.trace import OfferTrace, TraceNotFoundError, build_offer_trace

router = APIRouter(prefix="/api/challenges", tags=["trace"])


@router.get("/{challenge_id}/trace", response_model=OfferTrace)
def get_offer_trace(challenge_id: str, request: Request, db: Session = Depends(get_db)) -> OfferTrace:
    """Return savings, offer, scope version, listing, baseline, expense, and transactions for one offer."""

    acting_account_id = require_acting_account_id(request)
    try:
        return build_offer_trace(challenge_id, acting_account_id, db)
    except TraceNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found") from error
