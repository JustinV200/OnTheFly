"""Answers whether an address opted out of invitations; used by the approval gate and again at send time."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.email_address import normalize_email
from app.models.outreach.suppression import OutreachSuppression


def suppressed_emails(emails: list[str], db: Session) -> frozenset[str]:
    """Return the normalized addresses among emails that opted out, in one query."""

    normalized = sorted({normalize_email(email) for email in emails if email})
    if not normalized:
        return frozenset()
    rows = db.scalars(select(OutreachSuppression.email).where(OutreachSuppression.email.in_(normalized))).all()
    return frozenset(rows)


def is_suppressed(email: str, db: Session) -> bool:
    """Return True when the address opted out; checked right before every send."""

    return db.get(OutreachSuppression, normalize_email(email)) is not None
