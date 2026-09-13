"""Builds the approval screen's payload: every recipient, the exact rendered messages, the listing link, and compliance.
Previewing stores nothing and sends nothing (roadmap 08, step 5).
"""

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.services.listings.owned_listing import get_owned_listing, require_public_listing
from app.services.outreach.approval.message_hash import build_message_hash
from app.services.outreach.approval.recipients import BlockedRecipient, PreviewMessage, resolve_recipient_batch
from app.services.outreach.compliance.check import ComplianceReport, check_compliance
from app.services.outreach.senders.base import OutreachSender
from app.services.outreach.senders.channel import ChannelInfo, describe_channel
from app.services.outreach.templates.links import public_listing_url
from app.services.outreach.templates.render import TEMPLATE_VERSION


class InvitationPreview(BaseModel):
    """What the owner sees before approving, and the hash approval must echo back."""

    listing_id: str
    listing_url: str
    message_hash: str
    template_version: str
    channel: ChannelInfo
    compliance: ComplianceReport
    messages: list[PreviewMessage]
    blocked: list[BlockedRecipient]


def build_invitation_preview(
    listing_id: str,
    candidate_ids: list[str],
    acting_account_id: str,
    db: Session,
    settings: Settings,
    sender: OutreachSender,
) -> InvitationPreview:
    """Render the batch for the owner's public listing; raise 404 (not owner / unknown candidate) or 400.

    400 covers a listing that isn't public, a passed deadline, and a selection with no eligible
    recipient. A compliance failure is returned in the preview rather than raised, so the owner can
    see what to fix; approval is what refuses it.
    """

    listing = get_owned_listing(listing_id, acting_account_id, db)
    require_public_listing(listing, "sending invitations")
    batch = resolve_recipient_batch(listing, candidate_ids, sender, settings, db)
    return InvitationPreview(
        listing_id=listing.id,
        listing_url=public_listing_url(settings.public_app_base_url, listing.id),
        message_hash=build_message_hash(sender.name, batch.messages),
        template_version=TEMPLATE_VERSION,
        channel=describe_channel(sender),
        compliance=check_compliance(sender.name, settings, listing_is_public=True),
        messages=batch.messages,
        blocked=batch.blocked,
    )
