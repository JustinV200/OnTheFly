"""The split ledger: a task's starting price, the pieces its owner split off, and the remainder (roadmap 12, step 5).
Every figure is an integer in minor units in the task's one currency and billing period. Nothing converts periods.

Starting price: the listed price before acceptance, or the accepted offer after. A buyer's split before acceptance
lowers the parent's listed price by the cut, so for an unaccepted task the listed price plus those active cuts is the
starting price. Pieces split before acceptance stay with the buyer; after acceptance only the owner's pieces count.
Remainder = starting price − Σ(accepted price of each counted active piece, or its cut if not yet accepted).
"""

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.challenge import Challenge
from app.models.listing import ScopeVersion
from app.models.service_expense import ServiceExpense
from app.models.tasks import Task, TaskSplit
from app.services.listings.current_price import resolve_task_price
from app.services.tasks.access import listing_for_task


class PieceCommitment(BaseModel):
    """One counted active piece: its cut and, once accepted, the price its winner will be paid."""

    split_id: str
    child_task_id: str
    cut_minor: int
    accepted_price_minor: int | None
    # accepted_price_minor when accepted, else cut_minor.
    committed_minor: int


class TaskLedger(BaseModel):
    """A task's ledger for its current owner."""

    task_id: str
    currency: str
    billing_period: str
    # None only for a new task with no budget: it can't be split until its owner sets one (plan2).
    starting_price_minor: int | None
    # "accepted_offer" after acceptance, "listed_price" before.
    starting_price_basis: str
    pieces: list[PieceCommitment]
    total_cuts_minor: int
    committed_minor: int
    remainder_minor: int | None


class CutProblem(ValueError):
    """Raised when a proposed cut breaks a ledger rule; the message says which, in plain words."""


def build_ledger(task: Task, db: Session) -> TaskLedger:
    """Return the task's ledger for whoever owns it now."""

    counted = counted_splits(task, db)
    pieces = [_commitment(split, db) for split in counted]
    total_cuts = sum(piece.cut_minor for piece in pieces)
    committed = sum(piece.committed_minor for piece in pieces)
    starting, basis = _starting_price(task, counted, db)
    return TaskLedger(
        task_id=task.id,
        currency=task.currency,
        billing_period=task.billing_period,
        starting_price_minor=starting,
        starting_price_basis=basis,
        pieces=pieces,
        total_cuts_minor=total_cuts,
        committed_minor=committed,
        remainder_minor=starting - committed if starting is not None else None,
    )


def counted_splits(task: Task, db: Session) -> list[TaskSplit]:
    """Return the active splits that count against the current owner's remainder, oldest first."""

    is_accepted = task.accepted_challenge_id is not None
    return list(
        db.scalars(
            select(TaskSplit)
            .where(
                TaskSplit.parent_task_id == task.id,
                TaskSplit.undone_at.is_(None),
                TaskSplit.split_before_acceptance.is_(not is_accepted),
            )
            .order_by(TaskSplit.created_at)
        ).all()
    )


def check_new_cut(ledger: TaskLedger, cut_minor: int, currency: str, billing_period: str) -> None:
    """Raise CutProblem unless a new piece with this cut fits the ledger.

    Rules: a starting price exists, the cut is positive and in the task's currency and period, total cuts stay
    within the starting price, and the remainder stays at or above zero.
    """

    if ledger.starting_price_minor is None:
        raise CutProblem("This task has no starting price. Set a budget before splitting off a piece.")
    if cut_minor <= 0:
        raise CutProblem("A cut must be a positive amount.")
    if currency != ledger.currency:
        raise CutProblem(f"A cut must be in the task's currency ({ledger.currency}), not {currency}.")
    if billing_period != ledger.billing_period:
        raise CutProblem(
            f"A cut must be per the task's billing period ({ledger.billing_period}), not {billing_period}. "
            "Periods aren't converted between a task and its pieces."
        )
    if ledger.total_cuts_minor + cut_minor > ledger.starting_price_minor:
        raise CutProblem("Total cuts would exceed the starting price.")
    if ledger.remainder_minor is not None and ledger.remainder_minor - cut_minor < 0:
        raise CutProblem("This cut would push your remainder below zero.")


def remainder_if_piece_accepted(ledger: TaskLedger, child_task_id: str, offer_price_minor: int) -> int | None:
    """Return the owner's remainder if the piece's offer at this price were accepted; None without a starting price."""

    if ledger.starting_price_minor is None:
        return None
    others = sum(piece.committed_minor for piece in ledger.pieces if piece.child_task_id != child_task_id)
    return ledger.starting_price_minor - others - offer_price_minor


def _commitment(split: TaskSplit, db: Session) -> PieceCommitment:
    child = db.get(Task, split.child_task_id)
    accepted = child.accepted_price_minor if child is not None and child.accepted_challenge_id else None
    return PieceCommitment(
        split_id=split.id,
        child_task_id=split.child_task_id,
        cut_minor=split.cut_minor,
        accepted_price_minor=accepted,
        committed_minor=accepted if accepted is not None else split.cut_minor,
    )


def _starting_price(task: Task, counted: list[TaskSplit], db: Session) -> tuple[int | None, str]:
    if task.accepted_challenge_id is not None:
        if task.accepted_price_minor is None:
            # Acceptance always snapshots the price; a gap here is a bug, not a zero.
            raise LookupError(f"Accepted task {task.id} has no accepted price")
        return task.accepted_price_minor, "accepted_offer"
    listed = listed_price_minor(task, db)
    if listed is None:
        return None, "listed_price"
    # Unaccepted: every counted split is the buyer's, and each one already lowered the listed price by its cut.
    return listed + sum(split.cut_minor for split in counted), "listed_price"


def listed_price_minor(task: Task, db: Session) -> int | None:
    """Return the task's current listed price in its period, from its listing's current scope version."""

    listing = listing_for_task(task.id, db)
    scope = db.get(ScopeVersion, listing.scope_version_id) if listing is not None else None
    if scope is None:
        return None
    expense = db.get(ServiceExpense, task.expense_id) if task.expense_id else None
    price = resolve_task_price(expense, scope)
    return price.amount.amount if price is not None else None


def accepted_challenge(task: Task, db: Session) -> Challenge | None:
    """Return the task's accepted offer, or None before acceptance."""

    return db.get(Challenge, task.accepted_challenge_id) if task.accepted_challenge_id else None
