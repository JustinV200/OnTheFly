"""The money view of a task its viewer posted (plan2, "Money views", buyer): baseline, accepted and pending amounts,
and the potential difference. It names only the accepted bidder and the viewer's own pieces, never what that bidder
splits off afterwards.
"""

from sqlalchemy.orm import Session

from app.core.task_lifecycle import TaskOrigin
from app.models.tasks import Task, TaskSplit
from app.services.splitting.ledger import PieceCommitment, listed_price_minor
from app.services.tasks.comparison_label import savings_label_for
from app.services.tasks.money.pieces import piece_lines, pre_acceptance_splits, winner_of
from app.services.tasks.money.types import BuyerMoneyView

_BASELINE_LABELS = {
    TaskOrigin.rebid.value: "What you pay now (observed spend)",
    TaskOrigin.new.value: "Your budget",
    TaskOrigin.split.value: "Your cut for this piece",
}


def buyer_money_view(task: Task, account_id: str, db: Session) -> BuyerMoneyView | None:
    """Return the view for the task's poster; None for any other account."""

    if task.posted_by_account_id != account_id:
        return None
    own_splits = pre_acceptance_splits(task, db)
    own_pieces = piece_lines([_commitment(split, db) for split in own_splits], db)
    pieces_committed = sum(piece.committed_minor for piece in own_pieces)
    cuts = sum(split.cut_minor for split in own_splits)

    is_accepted = task.accepted_challenge_id is not None
    task_amount = task.accepted_price_minor if is_accepted else listed_price_minor(task, db)
    baseline = _baseline(task, cuts, db)
    committed = task_amount + pieces_committed if task_amount is not None else None
    difference = baseline - committed if baseline is not None and committed is not None else None
    return BuyerMoneyView(
        task_id=task.id,
        origin=task.origin,
        currency=task.currency,
        billing_period=task.billing_period,
        baseline_minor=baseline,
        baseline_label=_BASELINE_LABELS.get(task.origin, "Baseline"),
        task_status=task.state,
        task_amount_minor=task_amount,
        accepted_bidder=winner_of(task, db),
        own_pieces=own_pieces,
        committed_minor=committed,
        potential_difference_minor=difference,
        difference_label=savings_label_for(task),
        is_fully_accepted=is_accepted and all(piece.accepted_price_minor is not None for piece in own_pieces),
    )


def _baseline(task: Task, own_cuts_minor: int, db: Session) -> int | None:
    # The price before any of the poster's own splits. After acceptance it is the snapshot taken at acceptance;
    # before, the listed price plus the cuts that price already excludes.
    if task.accepted_challenge_id is not None:
        return task.listed_starting_price_minor
    listed = listed_price_minor(task, db)
    return listed + own_cuts_minor if listed is not None else None


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
