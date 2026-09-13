"""Finds or creates the rebid task behind an expense's listing (roadmap 12, step 1).
The expense publish flow calls this, so every listing it drafts resolves to exactly one task.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.task_lifecycle import TaskOrigin, TaskState
from app.models.listing import PublicListingRecord
from app.models.service_expense import ServiceExpense
from app.models.tasks import Task
from app.services.tasks.events import write_task_event


def ensure_rebid_task(
    expense: ServiceExpense,
    listing: PublicListingRecord | None,
    currency: str,
    billing_period: str,
    db: Session,
) -> Task:
    """Return the expense's rebid task, creating it with the expense owner as poster and task owner.

    A task's currency and period follow the price confirmed on the latest scope, so they are refreshed while the
    task is unaccepted; after acceptance they are fixed, because the accepted price and every cut are in them.
    """

    task = db.get(Task, listing.task_id) if listing is not None and listing.task_id else None
    if task is None:
        task = db.scalar(
            select(Task).where(Task.expense_id == expense.id, Task.origin == TaskOrigin.rebid.value)
        )
    if task is None:
        task = Task(
            origin=TaskOrigin.rebid.value,
            expense_id=expense.id,
            posted_by_account_id=expense.owner_account_id,
            owner_account_id=expense.owner_account_id,
            depth=0,
            state=TaskState.private.value,
            category=expense.owner_corrected_category or expense.category or "cleaning",
            currency=currency,
            billing_period=billing_period,
        )
        db.add(task)
        db.flush()
        write_task_event(task.id, expense.owner_account_id, "created", {"origin": TaskOrigin.rebid.value}, db)
    elif task.accepted_challenge_id is None:
        task.currency = currency
        task.billing_period = billing_period
    return task
