"""Decides, per candidate, whether an invitation may be prepared, and says why not when it can't.
One function feeds both the owner's list and the approval gate, so the two can never disagree.
"""

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.listing import PublicListingRecord
from app.models.outreach.invitation import Invitation
from app.models.outreach.provider_candidate import ProviderCandidate
from app.services.listings.owned_listing import listing_is_public
from app.services.outreach.senders.base import OutreachSender
from app.services.outreach.suppression import suppressed_emails


class CandidateEligibility(BaseModel):
    """Whether the candidate can be invited now; reason is None only when it can."""

    can_invite: bool
    reason: str | None


class AssessedCandidate(BaseModel):
    """A candidate's eligibility plus the invitation it already has, if any."""

    eligibility: CandidateEligibility
    invitation_id: str | None


def assess_candidates(
    listing: PublicListingRecord,
    candidates: list[ProviderCandidate],
    sender: OutreachSender,
    db: Session,
) -> dict[str, AssessedCandidate]:
    """Return each candidate's eligibility keyed by candidate id, loading invitations and opt-outs in bulk.

    Reasons are checked in a fixed order, so the owner sees the most decisive one: listing not
    public, already invited, contacted by hand, no published email, opted out, channel refusal.
    """

    invitation_ids = _invitation_ids_by_candidate(listing.id, db)
    opted_out = suppressed_emails([candidate.contact_email or "" for candidate in candidates], db)
    is_public = listing_is_public(listing)

    assessed: dict[str, AssessedCandidate] = {}
    for candidate in candidates:
        reason = _blocking_reason(candidate, is_public, candidate.id in invitation_ids, opted_out, sender)
        assessed[candidate.id] = AssessedCandidate(
            eligibility=CandidateEligibility(can_invite=reason is None, reason=reason),
            invitation_id=invitation_ids.get(candidate.id),
        )
    return assessed


def _blocking_reason(
    candidate: ProviderCandidate,
    is_public: bool,
    has_invitation: bool,
    opted_out: frozenset[str],
    sender: OutreachSender,
) -> str | None:
    if not is_public:
        return "Listing is not public"
    if has_invitation:
        # The idempotency key allows one invitation per provider per listing, ever.
        return "Already invited"
    if candidate.contacted_off_platform:
        # Roadmap 08, "Watch out for": an automated duplicate after a human conversation reads as spam.
        return "Contacted off-platform — invite manually"
    if not candidate.contact_email:
        return "No published contact email"
    if candidate.contact_email in opted_out:
        return "Opted out of invitations"
    # e.g. smtp refuses anyone off the allowlist; blocking here keeps a doomed send from using up the
    # provider's one invitation.
    return sender.refusal_reason(candidate.contact_email)


def _invitation_ids_by_candidate(listing_id: str, db: Session) -> dict[str, str]:
    rows = db.execute(
        select(Invitation.provider_candidate_id, Invitation.id).where(Invitation.listing_id == listing_id)
    ).all()
    return {row.provider_candidate_id: row.id for row in rows}
