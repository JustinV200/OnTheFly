"""Builds My work: the tasks an account owns through accepted offers, and the tasks it posted (roadmap 12, step 10).
Each item carries only that account's own money view of the task.
"""

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.task_lifecycle import TaskOrigin
from app.core.visibility import ListingVisibility
from app.models.challenge import Challenge
from app.models.tasks import Task
from app.services.tasks.access import listing_for_task, relationship_to
from app.services.tasks.listing.subcontract import is_subcontract
from app.services.tasks.money import buyer_money_view, owner_money_view
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
        listing_id=listing.id if listing is not None and is_poster else None,
        listing_visibility=listing.visibility if listing is not None and is_poster else None,
        offer_count=offer_count if is_poster else 0,
        buyer_money=buyer_money_view(task, account_id, db),
        owner_money=owner_money_view(task, account_id, db),
        next_step=_next_step(task, account_id, listing.visibility if listing is not None else None, offer_count),
    )


def _next_step(task: Task, account_id: str, visibility: str | None, offer_count: int) -> str | None:
    # Plain next actions for the demo; none of these do anything by themselves.
    if task.owner_account_id == account_id and task.accepted_challenge_id is not None:
        return "Open Ways to save to find pieces worth splitting off"
    if task.posted_by_account_id != account_id:
        return None
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
    return None
