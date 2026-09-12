"""Implements owner-only challenger evidence retrieval.
Unimplemented checks stay visible as not_checked instead of disappearing.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.evidence.schemas import ChallengerEvidenceResponse
from app.core.identity import require_acting_account_id
from app.db.session import get_db
from app.models.challenge import Challenge
from app.models.listing import PublicListingRecord
from app.services.evidence.check import CheckResult
from app.services.evidence.refresh import get_or_refresh_challenger_evidence

router = APIRouter(prefix="/api/challenges", tags=["evidence"])


@router.get("/{challenge_id}/evidence", response_model=ChallengerEvidenceResponse)
def get_challenge_evidence(
    challenge_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> ChallengerEvidenceResponse:
    """Return all named evidence checks for one challenge to the listing owner."""

    acting_account_id = require_acting_account_id(request)
    challenge = db.get(Challenge, challenge_id)
    if challenge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found")
    listing = db.get(PublicListingRecord, challenge.listing_id)
    if listing is None or listing.owner_account_id != acting_account_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found")

    evidence = get_or_refresh_challenger_evidence(challenge, db)
    return ChallengerEvidenceResponse(
        challenge_id=evidence.challenge_id,
        challenger_account_id=evidence.challenger_account_id,
        platform_check=CheckResult.model_validate_json(evidence.platform_check),
        identity_check=CheckResult.model_validate_json(evidence.identity_check),
        registry_check=CheckResult.model_validate_json(evidence.registry_check),
        last_updated=evidence.last_updated,
    )
