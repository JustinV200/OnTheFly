"""Assembles the owner's outreach page for one listing: channel, compliance, discovery, candidates, invitations, summary.
Reading it changes nothing; it states which parts (delivery tracking, an unavailable source) are not available.
"""

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.invitation_state import InvitationState
from app.models.outreach.discovery_run import DiscoveryRun
from app.services.discovery import DiscoveryRunView, DiscoverySource, discovery_run_view
from app.services.listings.owned_listing import get_owned_listing, listing_is_public
from app.services.listings.projection import projection_from_record
from app.services.outreach.candidates import (
    CandidateView,
    list_candidate_views,
    recommended_candidate_ids,
)
from app.services.outreach.compliance.check import ComplianceReport, check_compliance
from app.services.outreach.rate import ImpliedRate, implied_rate_from_projection
from app.services.outreach.senders.base import OutreachSender
from app.services.outreach.senders.channel import ChannelInfo, describe_channel
from app.services.outreach.status.invitation_view import (
    CHALLENGED_DISPLAY_STATE,
    InvitationView,
    list_invitation_views,
)
from app.services.outreach.templates.links import public_listing_url


class DiscoverySourceInfo(BaseModel):
    """The configured discovery source and whether it can run."""

    name: str
    label: str
    available: bool
    unavailable_reason: str | None


class DiscoveryStatusView(BaseModel):
    """The configured source plus the most recent run on this listing, if any."""

    source: DiscoverySourceInfo
    last_run: DiscoveryRunView | None


class OutreachSummary(BaseModel):
    """Counts per stored state; delivery_tracked is False because delivered/opened need webhooks not built."""

    invited: int
    queued: int
    sending: int
    sent: int
    failed: int
    suppressed: int
    challenged: int
    delivery_tracked: bool


class OutreachOverview(BaseModel):
    """Everything the owner's outreach view needs for one listing."""

    listing_id: str
    listing_visibility: str
    listing_is_public: bool
    listing_url: str
    channel: ChannelInfo
    compliance: ComplianceReport
    discovery: DiscoveryStatusView
    implied_rate: ImpliedRate
    recommended_candidate_ids: list[str]
    candidates: list[CandidateView]
    invitations: list[InvitationView]
    summary: OutreachSummary


def get_outreach_overview(
    listing_id: str,
    acting_account_id: str,
    db: Session,
    settings: Settings,
    sender: OutreachSender,
    discovery_source: DiscoverySource,
) -> OutreachOverview:
    """Return the outreach overview for the owner's listing; raise 404 for anyone else.

    Works for a non-public listing too, so an owner who unpublished still sees who was invited;
    every candidate then reads "Listing is not public".
    """

    listing = get_owned_listing(listing_id, acting_account_id, db)
    is_public = listing_is_public(listing)
    invitations = list_invitation_views(listing.id, db)
    last_run = db.scalar(
        select(DiscoveryRun).where(DiscoveryRun.listing_id == listing.id).order_by(DiscoveryRun.ran_at.desc()).limit(1)
    )
    unavailable_reason = discovery_source.unavailable_reason()
    candidates = list_candidate_views(listing, sender, db)

    return OutreachOverview(
        listing_id=listing.id,
        listing_visibility=listing.visibility,
        listing_is_public=is_public,
        listing_url=public_listing_url(settings.public_app_base_url, listing.id),
        channel=describe_channel(sender),
        compliance=check_compliance(sender.name, settings, listing_is_public=is_public),
        discovery=DiscoveryStatusView(
            source=DiscoverySourceInfo(
                name=discovery_source.name,
                label=discovery_source.label,
                available=unavailable_reason is None,
                unavailable_reason=unavailable_reason,
            ),
            last_run=discovery_run_view(last_run) if last_run is not None else None,
        ),
        implied_rate=implied_rate_from_projection(projection_from_record(listing)),
        recommended_candidate_ids=recommended_candidate_ids(candidates),
        candidates=candidates,
        invitations=invitations,
        summary=_summarize(invitations, sender),
    )


def _summarize(invitations: list[InvitationView], sender: OutreachSender) -> OutreachSummary:
    def count(state: InvitationState) -> int:
        return sum(1 for invitation in invitations if invitation.state == state.value)

    return OutreachSummary(
        invited=len(invitations),
        queued=count(InvitationState.queued),
        sending=count(InvitationState.sending),
        sent=count(InvitationState.sent),
        failed=count(InvitationState.failed),
        suppressed=count(InvitationState.suppressed),
        challenged=sum(1 for invitation in invitations if invitation.display_state == CHALLENGED_DISPLAY_STATE),
        delivery_tracked=sender.tracks_delivery,
    )
