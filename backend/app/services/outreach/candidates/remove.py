"""Removes a candidate the owner doesn't want in the list, unless it was already invited.
An invited candidate stays: it is the record of who received the invitation.
"""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.outreach.invitation import Invitation
from app.models.outreach.provider_candidate import ProviderCandidate


def remove_candidate(candidate_id: str, acting_account_id: str, db: Session) -> None:
    """Delete the candidate; raise 404 unless the acting account owns it, and 409 once it has an invitation."""

    candidate = db.scalar(
        select(ProviderCandidate).where(
            ProviderCandidate.id == candidate_id,
            ProviderCandidate.owner_account_id == acting_account_id,
        )
    )
    if candidate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    invitation_id = db.scalar(select(Invitation.id).where(Invitation.provider_candidate_id == candidate.id))
    if invitation_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This provider was already invited; it stays in the list as the record of that invitation",
        )

    db.delete(candidate)
    db.commit()
