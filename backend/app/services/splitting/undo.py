"""Undoes a split: the cut and requirements return to the parent, the piece's listing closes, and its offers are kept.
Allowed only while the piece has no accepted offer and, for a buyer's split, while the parent has none either.
"""

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.task_lifecycle import TaskState
from app.core.visibility import ListingVisibility
from app.models.listing import ScopeVersion
from app.models.savings import SavingsCard
from app.models.tasks import RequirementAssignment, Task, TaskSplit
from app.services.listings.audit import write_visibility_audit
from app.services.listings.projection import projection_from_record
from app.services.savings.cards import mark_task_cards_stale
from app.services.splitting.parent_rewrite import latest_rows_for_keys, write_parent_with
from app.services.tasks.access import listing_for_task
from app.services.tasks.events import write_task_event


def undo_split(split_id: str, acting_account_id: str, db: Session) -> TaskSplit:
    """Undo one active split made by the acting account; raise 404/400 with the reason when it can't be undone."""

    split = db.get(TaskSplit, split_id)
    parent = db.get(Task, split.parent_task_id) if split is not None else None
    child = db.get(Task, split.child_task_id) if split is not None else None
    if split is None or parent is None or child is None or split.split_by_account_id != acting_account_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Split not found")
    if parent.owner_account_id != acting_account_id and not split.split_before_acceptance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Split not found")
    _ensure_undoable(split, parent, child, db)

    split.undone_at = datetime.now(timezone.utc)
    _close_piece_listing(child, acting_account_id, db)
    keys = list(db.scalars(select(RequirementAssignment.requirement_key).where(RequirementAssignment.split_id == split.id)))
    if split.split_before_acceptance:
        listing = listing_for_task(parent.id, db)
        current = db.get(ScopeVersion, listing.scope_version_id) if listing is not None else None
        if listing is None or current is None:
            raise LookupError(f"Parent task {parent.id} lost its listing")
        write_parent_with(
            parent, listing, current, latest_rows_for_keys(parent, keys, db), split.cut_minor, acting_account_id, child.id, db
        )
    # The requirements returned, so every card is recomputed on the next Ways to save load.
    mark_task_cards_stale(parent.id, db)
    if split.savings_card_id:
        card = db.get(SavingsCard, split.savings_card_id)
        if card is not None:
            card.status = "stale"

    write_task_event(
        parent.id,
        acting_account_id,
        "split_undone",
        {"split_id": split.id, "child_task_id": child.id, "cut_minor": split.cut_minor, "requirement_keys": keys},
        db,
    )
    db.commit()
    db.refresh(split)
    return split


def _ensure_undoable(split: TaskSplit, parent: Task, child: Task, db: Session) -> None:
    if split.undone_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This split was already undone")
    if child.accepted_challenge_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This piece already accepted an offer, so the split can't be undone.",
        )
    if split.split_before_acceptance and parent.accepted_challenge_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You accepted an offer on the parent task since splitting this piece off, so the split can't be undone.",
        )
    child_splits = db.scalar(
        select(func.count()).select_from(TaskSplit).where(TaskSplit.parent_task_id == child.id, TaskSplit.undone_at.is_(None))
    )
    if child_splits:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This piece has pieces of its own. Undo those splits first.",
        )


def _close_piece_listing(child: Task, acting_account_id: str, db: Session) -> None:
    listing = listing_for_task(child.id, db)
    child.state = TaskState.closed.value
    if listing is None:
        return
    previous_state = listing.visibility
    listing.visibility = ListingVisibility.closed.value
    projection = projection_from_record(listing)
    write_visibility_audit(None, acting_account_id, previous_state, listing.visibility, projection.model_dump_json(), db, child.id)
