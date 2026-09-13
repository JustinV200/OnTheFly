"""Chooses a small first outreach wave from the already ordered, owner-visible candidate list."""

from app.services.outreach.candidates.view import CandidateView

RECOMMENDED_OUTREACH_SIZE = 3


def recommended_candidate_ids(candidates: list[CandidateView]) -> list[str]:
    """Return up to three currently inviteable candidates without claiming a new quality ranking.

    Discovery already orders its USAspending shortlist before persistence. This helper preserves the owner-facing
    order and filters only on the same eligibility decision used by preview and approval.
    """

    return [candidate.id for candidate in candidates if candidate.eligibility.can_invite][
        :RECOMMENDED_OUTREACH_SIZE
    ]
