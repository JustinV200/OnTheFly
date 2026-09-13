"""Owner endpoints for the approval gate and delivery: preview, approve, retry the queue, read the sandbox outbox.
The approve click is the only trigger that sends; handlers stay thin and delegate to services and the worker.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.invitations.dependencies import sender_dependency, settings_dependency
from app.api.invitations.schemas import (
    ApproveInvitationsRequest,
    ApproveInvitationsResponse,
    CandidateSelectionRequest,
    SandboxOutboxResponse,
)
from app.core.config import Settings
from app.core.identity import require_acting_account_id
from app.db.session import get_db
from app.services.listings.owned_listing import get_owned_listing
from app.services.outreach import (
    InvitationPreview,
    OutreachSender,
    approve_invitations,
    build_invitation_preview,
    list_invitation_views,
    list_sandbox_outbox,
)
from app.workers.outreach import QueueRunSummary, process_outreach_queue

router = APIRouter()


@router.post("/listings/{listing_id}/preview", response_model=InvitationPreview)
def preview_invitations(
    listing_id: str,
    request: Request,
    payload: CandidateSelectionRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(settings_dependency),
    sender: OutreachSender = Depends(sender_dependency),
) -> InvitationPreview:
    """Render the exact batch for the selected candidates; stores and sends nothing."""

    acting_account_id = require_acting_account_id(request)
    return build_invitation_preview(listing_id, payload.candidate_ids, acting_account_id, db, settings, sender)


@router.post("/listings/{listing_id}/approve", response_model=ApproveInvitationsResponse)
def approve_and_send_invitations(
    listing_id: str,
    request: Request,
    payload: ApproveInvitationsRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(settings_dependency),
    sender: OutreachSender = Depends(sender_dependency),
) -> ApproveInvitationsResponse:
    """Approve the previewed batch, then send this listing's due invitations immediately.

    The owner's click is the send trigger (roadmap 08, step 5). A repeated click replays the
    approval, and the queue never sends an invitation twice.
    """

    acting_account_id = require_acting_account_id(request)
    result = approve_invitations(
        listing_id,
        payload.candidate_ids,
        payload.previewed_message_hash,
        acting_account_id,
        db,
        settings,
        sender,
    )
    queue = process_outreach_queue(db, sender, datetime.now(timezone.utc), listing_id=listing_id)
    return ApproveInvitationsResponse(
        approval_id=result.approval_id,
        replayed=result.replayed,
        invitations=list_invitation_views(listing_id, db, invitation_ids=result.invitation_ids),
        queue=queue,
    )


@router.post("/listings/{listing_id}/process-queue", response_model=QueueRunSummary)
def retry_invitation_queue(
    listing_id: str,
    request: Request,
    db: Session = Depends(get_db),
    sender: OutreachSender = Depends(sender_dependency),
) -> QueueRunSummary:
    """Send this listing's already-approved invitations whose retry time has come ("Retry now")."""

    acting_account_id = require_acting_account_id(request)
    listing = get_owned_listing(listing_id, acting_account_id, db)
    return process_outreach_queue(db, sender, datetime.now(timezone.utc), listing_id=listing.id)


@router.get("/listings/{listing_id}/outbox", response_model=SandboxOutboxResponse)
def get_sandbox_outbox(
    listing_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> SandboxOutboxResponse:
    """Return what the sandbox channel captured for this listing, newest first."""

    acting_account_id = require_acting_account_id(request)
    return SandboxOutboxResponse(messages=list_sandbox_outbox(listing_id, acting_account_id, db))
