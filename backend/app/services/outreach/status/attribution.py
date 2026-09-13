"""Attributes challenges to invitations by account, never by a tracking token (roadmap 08, step 9).
A challenge counts when its challenger account's contact email exactly equals the invited address and it arrived after the send.
"""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.email_address import normalize_email
from app.core.timestamps import as_utc
from app.models.account import Account
from app.models.challenge import Challenge
from app.models.outreach.invitation import Invitation


def find_challenged_at(listing_id: str, invitations: list[Invitation], db: Session) -> dict[str, datetime]:
    """Return, per invitation id, when the invited account first challenged this listing after the send.

    Matching is exact normalized-address equality, the deterministic identity rule; a similar name
    or domain never counts. An invitation that was never sent can't have caused a challenge.
    """

    rows = db.execute(
        select(Account.contact_email, Challenge.submitted_at)
        .join(Account, Account.id == Challenge.challenger_account_id)
        .where(Challenge.listing_id == listing_id)
        .where(Challenge.is_active.is_(True))
        .where(Account.contact_email.is_not(None))
    ).all()
    submitted_by_email: dict[str, list[datetime]] = {}
    for row in rows:
        submitted_by_email.setdefault(normalize_email(row.contact_email), []).append(as_utc(row.submitted_at))

    challenged_at: dict[str, datetime] = {}
    for invitation in invitations:
        if invitation.sent_at is None:
            continue
        sent_at = as_utc(invitation.sent_at)
        after_send = [
            submitted_at
            for submitted_at in submitted_by_email.get(normalize_email(invitation.recipient_email), [])
            if submitted_at >= sent_at
        ]
        if after_send:
            challenged_at[invitation.id] = min(after_send)
    return challenged_at
