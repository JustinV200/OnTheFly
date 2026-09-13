"""Resolves an owner's selected candidates into rendered messages and blocked recipients with reasons.
Preview and approval both call this, so what the owner approves is re-derived exactly as it was previewed.
"""

from datetime import datetime, timezone

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.timestamps import as_utc
from app.models.account import Account
from app.models.listing import PublicListingRecord
from app.models.outreach.provider_candidate import ProviderCandidate
from app.services.listings.projection import projection_from_record
from app.services.outreach.candidates.eligibility import assess_candidates
from app.services.outreach.senders.base import OutreachSender
from app.services.outreach.templates.render import render_invitation


class PreviewMessage(BaseModel):
    """One rendered invitation exactly as it would be stored and sent."""

    candidate_id: str
    to_name: str
    to_email: str
    subject: str
    body_text: str
    headers: dict[str, str]


class BlockedRecipient(BaseModel):
    """A selected candidate that will not be invited, and why."""

    candidate_id: str
    business_name: str
    reason: str


class RecipientBatch(BaseModel):
    """The eligible messages and blocked recipients for one selection."""

    messages: list[PreviewMessage]
    blocked: list[BlockedRecipient]


def resolve_recipient_batch(
    listing: PublicListingRecord,
    candidate_ids: list[str],
    sender: OutreachSender,
    settings: Settings,
    db: Session,
) -> RecipientBatch:
    """Render messages for eligible candidates and list the rest with reasons, in the owner's selection order.

    Assumes the listing is owned and public. Raises 404 when a selected id isn't a candidate on this
    listing, and 400 when the deadline has passed or no selected candidate can be invited.
    """

    _require_open_deadline(listing)
    ordered_ids = list(dict.fromkeys(candidate_ids))
    candidates = {
        candidate.id: candidate
        for candidate in db.scalars(
            select(ProviderCandidate).where(
                ProviderCandidate.listing_id == listing.id,
                ProviderCandidate.id.in_(ordered_ids),
            )
        ).all()
    }
    if len(candidates) != len(ordered_ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    owner = db.get(Account, listing.owner_account_id)
    if owner is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing owner not found")
    projection = projection_from_record(listing)
    selected = [candidates[candidate_id] for candidate_id in ordered_ids]
    assessed = assess_candidates(listing, selected, sender, db)

    messages: list[PreviewMessage] = []
    blocked: list[BlockedRecipient] = []
    batch_emails: set[str] = set()
    for candidate in selected:
        eligibility = assessed[candidate.id].eligibility
        if eligibility.can_invite and candidate.contact_email in batch_emails:
            # Two selected records sharing one address would be one inbox receiving two invitations.
            blocked.append(
                BlockedRecipient(
                    candidate_id=candidate.id,
                    business_name=candidate.business_name,
                    reason="Same email as another selected supplier",
                )
            )
            continue
        if not eligibility.can_invite or not candidate.contact_email:
            blocked.append(
                BlockedRecipient(
                    candidate_id=candidate.id,
                    business_name=candidate.business_name,
                    reason=eligibility.reason or "No published contact email",
                )
            )
            continue
        batch_emails.add(candidate.contact_email)
        rendered = render_invitation(projection, owner.business_name, owner.handle, candidate, settings)
        messages.append(
            PreviewMessage(
                candidate_id=candidate.id,
                to_name=candidate.business_name,
                to_email=candidate.contact_email,
                subject=rendered.subject,
                body_text=rendered.body_text,
                headers=rendered.headers,
            )
        )

    if not messages:
        reasons = "; ".join(f"{item.business_name}: {item.reason}" for item in blocked)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"None of the selected providers can be invited ({reasons})",
        )
    return RecipientBatch(messages=messages, blocked=blocked)


def _require_open_deadline(listing: PublicListingRecord) -> None:
    # An invitation to a listing that no longer accepts offers wastes the provider's one invitation.
    if listing.challenge_deadline is not None and as_utc(listing.challenge_deadline) <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The listing's offer deadline has passed, so invitations can't be sent",
        )
