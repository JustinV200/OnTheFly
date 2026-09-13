"""Outbound invitations (roadmap 08, steps 4-9): candidates, the template, compliance, delivery channels,
the approval gate, owner status, and opt-out. Strictly secondary: an invited provider lands on the same public listing as everyone.
"""

from app.services.outreach.approval import (
    ApprovalResult,
    BlockedRecipient,
    InvitationPreview,
    PreviewMessage,
    approve_invitations,
    build_invitation_preview,
)
from app.services.outreach.candidates import (
    CandidateEligibility,
    CandidateView,
    ManualCandidateInput,
    add_manual_candidate,
    candidate_view,
    list_candidate_views,
    remove_candidate,
    view_candidate,
)
from app.services.outreach.compliance import ComplianceCheck, ComplianceReport, check_compliance
from app.services.outreach.opt_out import OptOutDescription, OptOutResult, apply_opt_out, describe_opt_out
from app.services.outreach.senders import (
    ChannelInfo,
    OutgoingMessage,
    OutreachSender,
    SendResult,
    describe_channel,
    get_outreach_sender,
)
from app.services.outreach.status import (
    InvitationView,
    OutreachOverview,
    SandboxOutboxMessageView,
    get_outreach_overview,
    list_invitation_views,
    list_sandbox_outbox,
)
from app.services.outreach.suppression import is_suppressed
from app.services.outreach.templates import TEMPLATE_VERSION, RenderedInvitation, render_invitation

__all__ = [
    "ApprovalResult",
    "BlockedRecipient",
    "CandidateEligibility",
    "CandidateView",
    "ChannelInfo",
    "ComplianceCheck",
    "ComplianceReport",
    "InvitationPreview",
    "InvitationView",
    "ManualCandidateInput",
    "OptOutDescription",
    "OptOutResult",
    "OutgoingMessage",
    "OutreachOverview",
    "OutreachSender",
    "PreviewMessage",
    "RenderedInvitation",
    "SandboxOutboxMessageView",
    "SendResult",
    "TEMPLATE_VERSION",
    "add_manual_candidate",
    "apply_opt_out",
    "approve_invitations",
    "build_invitation_preview",
    "candidate_view",
    "check_compliance",
    "describe_channel",
    "describe_opt_out",
    "get_outreach_overview",
    "get_outreach_sender",
    "is_suppressed",
    "list_candidate_views",
    "list_invitation_views",
    "list_sandbox_outbox",
    "remove_candidate",
    "render_invitation",
    "view_candidate",
]
