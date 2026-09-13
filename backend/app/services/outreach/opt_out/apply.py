"""Records an opt-out from an invitation link. Idempotent: clicking twice leaves one suppression.
The suppression is by address, so it holds for every listing and every business on the platform.
"""

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.email_address import normalize_email
from app.models.outreach.suppression import OutreachSuppression
from app.services.outreach.opt_out.describe import find_candidate_by_opt_out_token
from app.services.outreach.suppression import is_suppressed


class OptOutResult(BaseModel):
    """Confirms the address is suppressed."""

    opted_out: bool


def apply_opt_out(token: str, db: Session) -> OptOutResult:
    """Suppress the address behind the token; raise 404 for an unknown token.

    Queued invitations to the address are not rewritten here: the queue checks suppression right
    before every send and marks them suppressed then, so the state change has one owner.
    """

    candidate = find_candidate_by_opt_out_token(token, db)
    if candidate.contact_email is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This link has no email address to opt out",
        )

    email = normalize_email(candidate.contact_email)
    if is_suppressed(email, db):
        return OptOutResult(opted_out=True)
    db.add(OutreachSuppression(email=email, via="opt_out_link"))
    try:
        db.commit()
    except IntegrityError:
        # A second click landed between the check and the insert; the address is suppressed either way.
        db.rollback()
    return OptOutResult(opted_out=True)
