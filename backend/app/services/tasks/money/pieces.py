"""Builds piece lines for the account that split the pieces off: cut, accepted price, status and its winner."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.challenge import Challenge
from app.models.tasks import Task, TaskSplit
from app.services.splitting.ledger import PieceCommitment
from app.services.tasks.access import listing_for_task
from app.services.tasks.listing.subcontract import is_subcontract
from app.services.tasks.money.types import Counterparty, PieceLine


def piece_lines(commitments: list[PieceCommitment], db: Session) -> list[PieceLine]:
    """Return one line per counted piece, in ledger order."""

    lines: list[PieceLine] = []
    for commitment in commitments:
        child = db.get(Task, commitment.child_task_id)
        if child is None:
            continue
        listing = listing_for_task(child.id, db)
        offer_count = (
            int(
                db.scalar(
                    select(func.count()).select_from(Challenge).where(Challenge.listing_id == listing.id, Challenge.is_active.is_(True))
                )
                or 0
            )
            if listing is not None
            else 0
        )
        lines.append(
            PieceLine(
                task_id=child.id,
                title=child.title,
                cut_minor=commitment.cut_minor,
                accepted_price_minor=commitment.accepted_price_minor,
                committed_minor=commitment.committed_minor,
                status=child.state,
                listing_visibility=listing.visibility if listing is not None else None,
                offer_count=offer_count,
                accepted_bidder=winner_of(child, db),
                is_subcontract=is_subcontract(child, db),
            )
        )
    return lines


def winner_of(task: Task, db: Session) -> Counterparty | None:
    """Return the accepted bidder of a task, or None before acceptance."""

    if task.accepted_challenge_id is None:
        return None
    account = db.get(Account, task.owner_account_id)
    if account is None:
        return None
    return Counterparty(role="task_owner", business_name=account.business_name, handle=account.handle)


def client_of(task: Task, db: Session) -> Counterparty | None:
    """Return the task's poster as the owner's client."""

    account = db.get(Account, task.posted_by_account_id)
    if account is None:
        return None
    return Counterparty(role="client", business_name=account.business_name, handle=account.handle)


def pre_acceptance_splits(task: Task, db: Session) -> list[TaskSplit]:
    """Return the active pieces the poster split off before accepting an offer."""

    return list(
        db.scalars(
            select(TaskSplit)
            .where(
                TaskSplit.parent_task_id == task.id,
                TaskSplit.undone_at.is_(None),
                TaskSplit.split_before_acceptance.is_(True),
            )
            .order_by(TaskSplit.created_at)
        ).all()
    )
