"""Clears the GovCon task chain back to its start: every task the three chain accounts posted or own, with its
listings, scope versions, offers, splits, cards, evidence, events and audits. Other businesses' data is untouched,
and GovCon's synthetic ledger is kept (its expenses return to private).

Destructive by design and reachable only while DEMO_CONTROLS_ENABLED is true. It refuses to run when any offer on
these listings is not demo data, so a genuine counteroffer is never deleted by a demo reset (roadmap 09).
"""

from sqlalchemy import delete, or_, select, update
from sqlalchemy.orm import Session

from app.core.provenance import OfferProvenance
from app.core.visibility import ListingVisibility
from app.models import (
    Challenge,
    ChallengeRequirementResponse,
    ChallengeRevision,
    ChallengerEvidence,
    DiscoveryRun,
    Invitation,
    InvitationApproval,
    MarketEvidence,
    ProviderCandidate,
    PublicListingRecord,
    Requirement,
    RequirementAssignment,
    SandboxOutboxMessage,
    SavingsCard,
    ScopeConstraint,
    ScopeVersion,
    ServiceExpense,
    Task,
    TaskEvent,
    TaskSplit,
    VisibilityAudit,
)
from app.services.demo.task_chain.accounts import CHAIN_ACCOUNT_IDS, GOVCON_ID


class GenuineOfferPresentError(RuntimeError):
    """Raised when a reset would delete an offer that isn't demo data."""


def clear_task_chain(db: Session) -> int:
    """Delete the chain's task data and return how many tasks were removed."""

    task_ids = _chain_task_ids(db)
    listing_ids = list(db.scalars(select(PublicListingRecord.id).where(PublicListingRecord.task_id.in_(task_ids))))
    expense_ids = list(db.scalars(select(ServiceExpense.id).where(ServiceExpense.owner_account_id == GOVCON_ID)))
    # A rebid's scope versions and listing are keyed by expense as well as task; clear both so nothing dangles.
    listing_ids += list(db.scalars(select(PublicListingRecord.id).where(PublicListingRecord.expense_id.in_(expense_ids))))
    scope_ids = list(
        db.scalars(select(ScopeVersion.id).where(or_(ScopeVersion.task_id.in_(task_ids), ScopeVersion.expense_id.in_(expense_ids))))
    )
    challenge_ids = list(db.scalars(select(Challenge.id).where(Challenge.listing_id.in_(listing_ids))))
    genuine = db.scalar(
        select(Challenge.id).where(
            Challenge.id.in_(challenge_ids), Challenge.provenance != OfferProvenance.demo_data.value
        ).limit(1)
    )
    if genuine is not None:
        raise GenuineOfferPresentError(
            "A non-demo offer is on a GovCon task-chain listing. Nothing was deleted; capture it with the demo seed "
            "ledger (python -m app.cli.seed_demo) before resetting the chain."
        )
    split_ids = list(
        db.scalars(select(TaskSplit.id).where(or_(TaskSplit.parent_task_id.in_(task_ids), TaskSplit.child_task_id.in_(task_ids))))
    )
    invitation_ids = list(db.scalars(select(Invitation.id).where(Invitation.listing_id.in_(listing_ids))))

    # Children before parents, so the order is valid even where the database enforces foreign keys.
    for statement in (
        delete(ChallengeRequirementResponse).where(ChallengeRequirementResponse.challenge_id.in_(challenge_ids)),
        delete(ChallengeRevision).where(ChallengeRevision.challenge_id.in_(challenge_ids)),
        delete(ChallengerEvidence).where(ChallengerEvidence.challenge_id.in_(challenge_ids)),
        delete(Challenge).where(Challenge.id.in_(challenge_ids)),
        delete(SandboxOutboxMessage).where(SandboxOutboxMessage.invitation_id.in_(invitation_ids)),
        delete(Invitation).where(Invitation.id.in_(invitation_ids)),
        delete(InvitationApproval).where(InvitationApproval.listing_id.in_(listing_ids)),
        delete(DiscoveryRun).where(DiscoveryRun.listing_id.in_(listing_ids)),
        delete(ProviderCandidate).where(ProviderCandidate.listing_id.in_(listing_ids)),
        delete(RequirementAssignment).where(RequirementAssignment.split_id.in_(split_ids)),
        delete(TaskSplit).where(TaskSplit.id.in_(split_ids)),
        delete(SavingsCard).where(SavingsCard.task_id.in_(task_ids)),
        delete(MarketEvidence).where(MarketEvidence.task_id.in_(task_ids)),
        delete(TaskEvent).where(TaskEvent.task_id.in_(task_ids)),
        delete(VisibilityAudit).where(or_(VisibilityAudit.task_id.in_(task_ids), VisibilityAudit.expense_id.in_(expense_ids))),
        delete(PublicListingRecord).where(PublicListingRecord.id.in_(listing_ids)),
        delete(Requirement).where(Requirement.scope_version_id.in_(scope_ids)),
        delete(ScopeConstraint).where(ScopeConstraint.scope_version_id.in_(scope_ids)),
        delete(ScopeVersion).where(ScopeVersion.id.in_(scope_ids)),
    ):
        db.execute(statement)
    # Deepest tasks first: a piece references its parent.
    for task_id in sorted(task_ids, key=lambda value: -_depth(value, db)):
        db.execute(delete(Task).where(Task.id == task_id))
    db.execute(
        update(ServiceExpense).where(ServiceExpense.id.in_(expense_ids)).values(visibility=ListingVisibility.private.value)
    )
    db.commit()
    return len(task_ids)


def _chain_task_ids(db: Session) -> list[str]:
    # Every task a chain account posted or owns, plus every descendant of those, whoever owns it now.
    frontier = set(
        db.scalars(
            select(Task.id).where(or_(Task.posted_by_account_id.in_(CHAIN_ACCOUNT_IDS), Task.owner_account_id.in_(CHAIN_ACCOUNT_IDS)))
        )
    )
    found = set(frontier)
    while frontier:
        children = set(db.scalars(select(Task.id).where(Task.parent_task_id.in_(frontier)))) - found
        found |= children
        frontier = children
    return list(found)


def _depth(task_id: str, db: Session) -> int:
    task = db.get(Task, task_id)
    return task.depth if task is not None else 0
