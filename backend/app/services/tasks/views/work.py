"""Builds My work: the tasks an account owns through accepted offers, and the tasks it posted (roadmap 12, step 10).
Each item carries only that account's own money view of the task.
"""

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.task_lifecycle import TaskOrigin, TaskState
from app.core.visibility import ListingVisibility
from app.models.challenge import Challenge
from app.models.tasks import Task
from app.services.tasks.access import listing_for_task, relationship_to
from app.services.tasks.listing.subcontract import is_subcontract
from app.services.tasks.money import OwnerMoneyView, buyer_money_view, owner_money_view
from app.services.tasks.views.parent_ref import visible_parent
from app.services.tasks.views.types import WorkItem, WorkResponse


def build_work(account_id: str, db: Session) -> WorkResponse:
    """Return the account's owned and posted tasks, newest first."""

    tasks = db.scalars(
        select(Task)
        .where(or_(Task.owner_account_id == account_id, Task.posted_by_account_id == account_id))
        .order_by(Task.created_at.desc())
    ).all()
    owned = [_item(task, account_id, db) for task in tasks if task.owner_account_id == account_id and task.accepted_challenge_id]
    posted = [_item(task, account_id, db) for task in tasks if task.posted_by_account_id == account_id]
    return WorkResponse(owned=owned, posted=posted)


def _item(task: Task, account_id: str, db: Session) -> WorkItem:
    relationship = relationship_to(task, account_id)
    listing = listing_for_task(task.id, db)
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
    is_poster = task.posted_by_account_id == account_id
    owner_money = owner_money_view(task, account_id, db)
    return WorkItem(
        task_id=task.id,
        title=task.title,
        origin=task.origin,
        state=task.state,
        category=task.category,
        currency=task.currency,
        billing_period=task.billing_period,
        relationship=relationship.value if relationship is not None else "none",
        is_subcontract=is_subcontract(task, db),
        parent=visible_parent(task, account_id, db),
        parent_scope_changed_at=task.parent_scope_changed_at if is_poster else None,
        listing_id=listing.id if listing is not None and is_poster else None,
        listing_visibility=listing.visibility if listing is not None and is_poster else None,
        offer_count=offer_count if is_poster else 0,
        buyer_money=buyer_money_view(task, account_id, db),
        owner_money=owner_money,
        next_step=_next_step(task, account_id, listing.visibility if listing is not None else None, offer_count, owner_money),
    )


def _next_step(task: Task, account_id: str, visibility: str | None, offer_count: int, owner_money: OwnerMoneyView | None) -> str | None:
    # Plain next actions for the demo; none of these do anything by themselves.
    if task.owner_account_id == account_id and task.accepted_challenge_id is not None:
        return _owner_next_step(owner_money)
    if task.posted_by_account_id != account_id:
        return None
    if task.state == TaskState.accepted.value:
        return "Accepted: the bidder owns the work now; see your money view"
    if task.parent_scope_changed_at is not None:
        return "The task this piece came from changed its scope: review"
    if visibility in (ListingVisibility.private.value, None) and task.origin != TaskOrigin.rebid.value:
        return "Draft: confirm scope, preview and publish"
    if visibility == ListingVisibility.scope_confirmed.value:
        return "Scope confirmed: preview and publish"
    if visibility == ListingVisibility.public.value and offer_count:
        return f"{offer_count} offer{'s' if offer_count != 1 else ''} to review"
    if visibility == ListingVisibility.public.value:
        return "Public: waiting for offers"
    if visibility == ListingVisibility.shortlisted.value:
        return f"Shortlisted: accept one of {offer_count} offer{'s' if offer_count != 1 else ''}" if offer_count else "Shortlisted"
    if visibility == ListingVisibility.closed.value:
        return "Bidding closed: accept an offer or publish again" if offer_count else "Bidding closed: publish again to get offers"
    return None


def _owner_next_step(owner_money: OwnerMoneyView | None) -> str:
    # The most urgent piece first: one still private, then one with offers waiting, then the task as a whole.
    pieces = owner_money.pieces if owner_money is not None else []
    open_pieces = [piece for piece in pieces if piece.accepted_bidder is None]
    unpublished = [piece for piece in open_pieces if piece.listing_visibility in (None, ListingVisibility.private.value, ListingVisibility.scope_confirmed.value)]
    if unpublished:
        return f"Publish your piece “{unpublished[0].title or 'Untitled piece'}”"
    with_offers = [piece for piece in open_pieces if piece.offer_count]
    if with_offers:
        count = with_offers[0].offer_count
        return f"{count} offer{'s' if count != 1 else ''} on your piece “{with_offers[0].title or 'Untitled piece'}”: review"
    if open_pieces:
        return "Your pieces are public: waiting for offers"
    if pieces:
        return "Every piece has an owner: check your remainder"
    return "Open Ways to save to find pieces worth splitting off"
