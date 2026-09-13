"""Describes what an opt-out link will do, for the public opt-out page.
It reveals only a masked address: never the listing, the business that sent it, or other recipients.
"""

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.outreach.provider_candidate import ProviderCandidate
from app.services.outreach.suppression import is_suppressed


class OptOutDescription(BaseModel):
    """The masked address behind a link and whether it already opted out."""

    email_masked: str | None
    already_opted_out: bool


def describe_opt_out(token: str, db: Session) -> OptOutDescription:
    """Return the masked address for a token; raise 404 for an unknown token."""

    candidate = find_candidate_by_opt_out_token(token, db)
    if candidate.contact_email is None:
        return OptOutDescription(email_masked=None, already_opted_out=False)
    return OptOutDescription(
        email_masked=mask_email(candidate.contact_email),
        already_opted_out=is_suppressed(candidate.contact_email, db),
    )


def find_candidate_by_opt_out_token(token: str, db: Session) -> ProviderCandidate:
    """Return the candidate whose invitation carried this token; raise 404 when none did."""

    candidate = db.scalar(select(ProviderCandidate).where(ProviderCandidate.opt_out_token == token))
    if candidate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opt-out link not found")
    return candidate


def mask_email(email: str) -> str:
    """Return e.g. "b***@bayclean.example": enough for the recipient to recognise, not enough to harvest."""

    local_part, _, domain = email.partition("@")
    return f"{local_part[:1]}***@{domain}"
