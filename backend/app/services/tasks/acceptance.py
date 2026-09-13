"""Accepts an offer on a task: bidding closes and task ownership moves to the offer's bidder (roadmap 12, step 4).
Acceptance is a marketplace record, not a contract. It is blocked when it would double-cover a requirement or push
the task owner's remainder below zero, and an offer above the listed price needs an explicit confirmation.
"""

from datetime import datetime, timezone
from typing import Literal

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.task_lifecycle import TaskState
from app.core.visibility import ListingVisibility
from app.models.challenge import Challenge
from app.models.savings import SavingsCard
from app.models.tasks import Task, TaskSplit
from app.services.listings.audit import write_visibility_audit
from app.services.listings.projection import projection_from_record
from app.services.splitting.ledger import build_ledger, counted_splits, listed_price_minor, remainder_if_piece_accepted
from app.services.splitting.requirements_in_play import keys_covered_by_pieces
from app.services.tasks.access import listing_for_task, require_task_poster
from app.services.tasks.events import write_task_event
from app.services.tasks.offer_price import offer_price_in_period


class AcceptanceBlock(BaseModel):
    """One reason an offer can't be accepted, in words the poster can act on."""

    code: Literal["already_accepted", "offer_not_active", "double_cover", "negative_remainder", "currency_mismatch"]
    message: str


class AcceptanceCheck(BaseModel):
    """What accepting this offer would do, computed without changing anything."""

    task_id: str
    challenge_id: str
    currency: str
    billing_period: str
    # The offer's recurring price restated in the task's period.
    offer_price_minor: int
    listed_price_minor: int | None
    is_above_listed_price: bool
    # For a piece: the remainder of the account that split it off, if this offer were accepted.
    remainder_after_minor: int | None
    blocks: list[AcceptanceBlock]
    can_accept: bool


def check_acceptance(task: Task, challenge_id: str, acting_account_id: str, db: Session) -> AcceptanceCheck:
    """Return the acceptance check for the poster; raise 404 for anyone else or an offer not on this task."""

    require_task_poster(task, acting_account_id, "accepting an offer")
    listing = listing_for_task(task.id, db)
    challenge = db.get(Challenge, challenge_id)
    if listing is None or challenge is None or challenge.listing_id != listing.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found on this task")

    blocks: list[AcceptanceBlock] = []
    if task.accepted_challenge_id is not None:
        blocks.append(AcceptanceBlock(code="already_accepted", message="This task already accepted an offer."))
    if not challenge.is_active:
        blocks.append(AcceptanceBlock(code="offer_not_active", message="This offer was withdrawn or replaced."))
    if challenge.price_currency != task.currency:
        blocks.append(
            AcceptanceBlock(
                code="currency_mismatch",
                message=f"This offer is in {challenge.price_currency}; the task is priced in {task.currency}.",
            )
        )
        offer_price = challenge.price_minor
    else:
        offer_price = offer_price_in_period(challenge, task.billing_period).amount

    covered = keys_covered_by_pieces(challenge.scope_version_id, task, db)
    if covered:
        blocks.append(
            AcceptanceBlock(
                code="double_cover",
                message=(
                    f"This offer answered a scope that includes {len(covered)} requirement(s) now split off into a piece. "
                    "Accepting it would pay twice for that work. Ask the bidder to revise onto the current scope."
                ),
            )
        )

    remainder_after = _remainder_after(task, offer_price, db)
    if remainder_after is not None and remainder_after < 0:
        blocks.append(
            AcceptanceBlock(
                code="negative_remainder",
                message="Accepting this offer would push your remainder on the task you split it from below zero.",
            )
        )

    listed = listed_price_minor(task, db)
    return AcceptanceCheck(
        task_id=task.id,
        challenge_id=challenge.id,
        currency=task.currency,
        billing_period=task.billing_period,
        offer_price_minor=offer_price,
        listed_price_minor=listed,
        is_above_listed_price=listed is not None and offer_price > listed,
        remainder_after_minor=remainder_after,
        blocks=blocks,
        can_accept=not blocks,
    )


def accept_offer(
    task_id: str,
    challenge_id: str,
    acting_account_id: str,
    is_above_price_confirmed: bool,
    db: Session,
) -> Task:
    """Accept one active offer as the poster; ownership transfers to its bidder. Raises 409 with the block's words."""

    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    check = check_acceptance(task, challenge_id, acting_account_id, db)
    if check.blocks:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=check.blocks[0].message)
    if check.is_above_listed_price and not is_above_price_confirmed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This offer is above your listed price. Confirm that you want to accept it anyway.",
        )

    challenge = db.get(Challenge, challenge_id)
    listing = listing_for_task(task.id, db)
    if challenge is None or listing is None:
        raise LookupError("check_acceptance passed for an offer or listing that no longer exists")

    prior_owner = task.owner_account_id
    # Read before ownership moves: afterwards the ledger's starting price is the accepted offer.
    listed_starting_price = build_ledger(task, db).starting_price_minor
    now = datetime.now(timezone.utc)
    task.accepted_challenge_id = challenge.id
    # The accepted scope is the version the accepted offer answered, whatever the listing shows now.
    task.accepted_scope_version_id = challenge.scope_version_id
    task.accepted_price_minor = check.offer_price_minor
    task.listed_starting_price_minor = listed_starting_price
    task.accepted_at = now
    task.owner_account_id = challenge.challenger_account_id
    task.state = TaskState.accepted.value

    previous_visibility = listing.visibility
    listing.visibility = ListingVisibility.accepted.value
    write_visibility_audit(
        listing.expense_id,
        acting_account_id,
        previous_visibility,
        listing.visibility,
        projection_from_record(listing).model_dump_json(),
        db,
        task.id,
    )
    write_task_event(
        task.id,
        acting_account_id,
        "accepted",
        {
            "challenge_id": challenge.id,
            "accepted_scope_version_id": challenge.scope_version_id,
            "accepted_price_minor": check.offer_price_minor,
            "billing_period": task.billing_period,
            "is_above_listed_price": check.is_above_listed_price,
        },
        db,
    )
    write_task_event(
        task.id,
        acting_account_id,
        "ownership_transferred",
        {"prior_owner_account_id": prior_owner, "new_owner_account_id": task.owner_account_id},
        db,
    )
    # Cards were priced with the prior owner's rates; the new owner computes its own.
    db.execute(
        update(SavingsCard)
        .where(SavingsCard.task_id == task.id, SavingsCard.account_id == prior_owner, SavingsCard.status == "suggested")
        .values(status="stale")
    )
    db.commit()
    db.refresh(task)
    return task


def _remainder_after(task: Task, offer_price_minor: int, db: Session) -> int | None:
    # Only a piece has a remainder upstream: the ledger of the task it was split from, for whoever split it.
    if task.parent_task_id is None:
        return None
    parent = db.get(Task, task.parent_task_id)
    split = db.scalar(select(TaskSplit).where(TaskSplit.child_task_id == task.id, TaskSplit.undone_at.is_(None)))
    if parent is None or split is None:
        return None
    if split.id not in {counted.id for counted in counted_splits(parent, db)}:
        # A buyer's earlier piece after the parent transferred: it no longer counts against anyone's remainder.
        return None
    return remainder_if_piece_accepted(build_ledger(parent, db), task.id, offer_price_minor)
