"""Records the owner's explicit approval and queues one invitation per approved recipient.
Nothing else creates invitations: not discovery, not publishing, not seeding, not any job (CLAUDE.md, "Outbound").
"""

import json

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.invitation_state import InvitationState
from app.models.account import Account
from app.models.listing import PublicListingRecord
from app.models.outreach.invitation import Invitation
from app.models.outreach.invitation_approval import InvitationApproval
from app.services.listings.owned_listing import get_owned_listing, require_public_listing
from app.services.outreach.approval.preview import InvitationPreview, render_unredacted_preview
from app.services.listings.projection import projection_from_record
from app.services.outreach.senders.base import OutreachSender
from app.services.outreach.templates.listing_terms import listing_terms_hash


class ApprovalResult(BaseModel):
    """The approval that authorized the invitations, and whether this call replayed an earlier one."""

    approval_id: str
    invitation_ids: list[str]
    replayed: bool


def approve_invitations(
    listing_id: str,
    candidate_ids: list[str],
    previewed_message_hash: str,
    acting_account_id: str,
    db: Session,
    settings: Settings,
    sender: OutreachSender,
) -> ApprovalResult:
    """Approve exactly the previewed batch and queue its invitations; sending is the queue's job.

    A repeat of an already-approved hash (a double-click) replays that approval and creates nothing.
    Raises 409 when the batch changed since the preview or compliance blocks the channel, and the
    preview's 404/400 errors otherwise.
    """

    listing = get_owned_listing(listing_id, acting_account_id, db)
    require_public_listing(listing, "sending invitations")
    earlier = _find_approval(listing.id, previewed_message_hash, db)
    if earlier is not None:
        return _replay(earlier, db)

    # The unredacted render: invitations store the recipient's real opt-out link. Only the preview shown to the owner hides it.
    preview = render_unredacted_preview(listing.id, candidate_ids, acting_account_id, db, settings, sender)
    if preview.message_hash != previewed_message_hash:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The invitation changed since you previewed it — preview again",
        )
    if not preview.compliance.ready:
        failing = "; ".join(
            check.detail for check in preview.compliance.checks if check.blocks_sending and not check.passed
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Sending is blocked: {failing}")

    try:
        # _stage flushes the approval row, so the unique-hash constraint can fire inside this block too.
        approval, invitations = _stage(preview, _current_terms_hash(listing, db), acting_account_id, sender, db)
        db.commit()
    except IntegrityError as error:
        # A concurrent identical approval (or another batch inviting one of these providers) committed
        # first. The unique constraints kept a second copy out; report whichever state now exists.
        db.rollback()
        earlier = _find_approval(listing.id, previewed_message_hash, db)
        if earlier is not None:
            return _replay(earlier, db)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Some of these providers were just invited by another approval — preview again",
        ) from error

    return ApprovalResult(
        approval_id=approval.id,
        invitation_ids=[invitation.id for invitation in invitations],
        replayed=False,
    )


def _current_terms_hash(listing: PublicListingRecord, db: Session) -> str:
    owner = db.get(Account, listing.owner_account_id)
    if owner is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing owner not found")
    return listing_terms_hash(projection_from_record(listing), owner.business_name, owner.handle)


def _stage(
    preview: InvitationPreview,
    terms_hash: str,
    acting_account_id: str,
    sender: OutreachSender,
    db: Session,
) -> tuple[InvitationApproval, list[Invitation]]:
    approval = InvitationApproval(
        listing_id=preview.listing_id,
        approved_by_account_id=acting_account_id,
        channel=sender.name,
        template_version=preview.template_version,
        message_hash=preview.message_hash,
        recipients=json.dumps(
            [
                {"candidate_id": message.candidate_id, "name": message.to_name, "email": message.to_email}
                for message in preview.messages
            ]
        ),
        listing_url=preview.listing_url,
        listing_terms_hash=terms_hash,
    )
    db.add(approval)
    db.flush()

    # Each invitation stores the exact subject, body, and headers the owner approved; nothing re-renders later.
    invitations = [
        Invitation(
            listing_id=preview.listing_id,
            provider_candidate_id=message.candidate_id,
            approval_id=approval.id,
            owner_account_id=acting_account_id,
            recipient_name=message.to_name,
            recipient_email=message.to_email,
            subject=message.subject,
            body_text=message.body_text,
            headers_json=json.dumps(message.headers),
            channel=sender.name,
            state=InvitationState.queued.value,
        )
        for message in preview.messages
    ]
    db.add_all(invitations)
    return approval, invitations


def _find_approval(listing_id: str, message_hash: str, db: Session) -> InvitationApproval | None:
    return db.scalar(
        select(InvitationApproval).where(
            InvitationApproval.listing_id == listing_id,
            InvitationApproval.message_hash == message_hash,
        )
    )


def _replay(approval: InvitationApproval, db: Session) -> ApprovalResult:
    invitation_ids = db.scalars(
        select(Invitation.id).where(Invitation.approval_id == approval.id).order_by(Invitation.created_at)
    ).all()
    return ApprovalResult(approval_id=approval.id, invitation_ids=list(invitation_ids), replayed=True)
