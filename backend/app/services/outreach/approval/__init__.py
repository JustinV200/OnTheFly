"""The approval gate: preview the exact batch, then approve that exact batch (roadmap 08, step 5)."""

from app.services.outreach.approval.approve import ApprovalResult, approve_invitations
from app.services.outreach.approval.message_hash import build_message_hash
from app.services.outreach.approval.preview import InvitationPreview, build_invitation_preview
from app.services.outreach.approval.recipients import BlockedRecipient, PreviewMessage

__all__ = [
    "ApprovalResult",
    "BlockedRecipient",
    "InvitationPreview",
    "PreviewMessage",
    "approve_invitations",
    "build_invitation_preview",
    "build_message_hash",
]
