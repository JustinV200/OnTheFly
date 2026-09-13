"""Loads a task for an acting account and states that account's direct relationship to it.
Only the poster and the task owner may read a task; anyone else gets the same 404, so task ids can't be probed.
"""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.task_lifecycle import TaskRelationship
from app.models.listing import PublicListingRecord
from app.models.tasks import Task


def relationship_to(task: Task, account_id: str) -> TaskRelationship | None:
    """Return the account's relationship to the task, or None when it is neither poster nor owner."""

    is_poster = task.posted_by_account_id == account_id
    is_owner = task.owner_account_id == account_id
    if is_poster and is_owner:
        return TaskRelationship.poster_and_owner
    if is_poster:
        return TaskRelationship.poster
    if is_owner:
        return TaskRelationship.owner
    return None


def get_participant_task(task_id: str, account_id: str, db: Session) -> tuple[Task, TaskRelationship]:
    """Return the task and relationship for its poster or owner; raise 404 for everyone else."""

    task = db.get(Task, task_id)
    relationship = relationship_to(task, account_id) if task is not None else None
    if task is None or relationship is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task, relationship


def require_task_owner(task: Task, account_id: str, action: str) -> None:
    """Raise 403 unless the account is the task's current owner, naming the refused action.

    The poster of an accepted task reads it but is refused here: acceptance moved responsibility to the bidder
    (CLAUDE.md, "Only the current task owner can split a task").
    """

    if task.owner_account_id == account_id:
        return
    if task.posted_by_account_id == account_id and task.accepted_challenge_id is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"You can't {action}: you accepted an offer on this task, so ownership moved to that bidder. "
                "Only the current task owner can do this."
            ),
        )
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")


def require_task_poster(task: Task, account_id: str, action: str) -> None:
    """Raise 404 unless the account posted the task; the poster alone publishes, reviews offers and accepts."""

    if task.posted_by_account_id != account_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task not found ({action} is for its poster)")


def listing_for_task(task_id: str, db: Session) -> PublicListingRecord | None:
    """Return the task's listing record, or None before one exists."""

    return db.scalar(select(PublicListingRecord).where(PublicListingRecord.task_id == task_id))


def task_for_listing(listing: PublicListingRecord, db: Session) -> Task | None:
    """Return the task a listing projects; None only for a record that predates tasks and was never backfilled."""

    return db.get(Task, listing.task_id) if listing.task_id else None
