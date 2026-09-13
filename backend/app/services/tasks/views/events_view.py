"""Turns audited task events into sentences, showing each participant only what is theirs to see.
A poster never sees the events of splits its task owner made; everyone sees creation, acceptance and ownership changes.
"""

import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.money import Money
from app.models.account import Account
from app.models.tasks import Task, TaskEvent
from app.services.tasks.views.types import TaskEventView

_SHARED_KINDS = {"created", "accepted", "ownership_transferred"}


def visible_events(task: Task, account_id: str, db: Session) -> list[TaskEventView]:
    """Return the task's events the account may see, newest first: its own actions plus the shared milestones."""

    rows = db.scalars(select(TaskEvent).where(TaskEvent.task_id == task.id).order_by(TaskEvent.created_at.desc())).all()
    names = {account.id: account.business_name for account in db.scalars(select(Account)).all()}
    return [
        TaskEventView(
            kind=row.kind,
            created_at=row.created_at,
            actor_name=names.get(row.account_id, "Unknown business"),
            summary=_summary(row, task, names),
        )
        for row in rows
        if row.kind in _SHARED_KINDS or row.account_id == account_id
    ]


def _summary(event: TaskEvent, task: Task, names: dict[str, str]) -> str:
    detail = json.loads(event.detail_json)
    actor = names.get(event.account_id, "A business")
    if event.kind == "created":
        return {"rebid": f"{actor} started a REBID", "new": f"{actor} posted new work", "split": f"{actor} split this piece off"}.get(
            str(detail.get("origin")), f"{actor} created the task"
        )
    if event.kind == "accepted":
        amount = _money(detail.get("accepted_price_minor"), task.currency)
        return f"{actor} accepted an offer at {amount} {_per_period(task.billing_period)}"
    if event.kind == "ownership_transferred":
        new_owner = names.get(str(detail.get("new_owner_account_id")), "the bidder")
        return f"Task ownership moved to {new_owner}"
    if event.kind == "split_off":
        return f"{actor} split off a piece with a cut of {_money(detail.get('cut_minor'), task.currency)}"
    if event.kind == "split_undone":
        return f"{actor} undid a split; {_money(detail.get('cut_minor'), task.currency)} returned"
    if event.kind == "constraint_removed":
        return f"{actor} removed an inherited constraint ({detail.get('kind')}: {detail.get('value')})"
    if event.kind == "parent_scope_reviewed":
        return f"{actor} reviewed a change to the parent task's scope"
    return f"{actor}: {event.kind.replace('_', ' ')}"


_PERIOD_WORDS = {"annual": "a year", "monthly": "a month", "quarterly": "a quarter", "weekly": "a week"}


def _per_period(billing_period: str) -> str:
    return _PERIOD_WORDS.get(billing_period, f"per {billing_period} period")


def _money(amount: object, currency: str) -> str:
    """Format for a sentence read aloud: thousands separators, so $1,298,000.00 doesn't read as a raw number."""

    if not isinstance(amount, int):
        return "an amount"
    money = Money(amount=amount, currency=currency)
    sign = "-" if money.amount < 0 else ""
    absolute = abs(money.amount)
    symbol = "$" if currency.upper() == "USD" else f"{currency.upper()} "
    return f"{sign}{symbol}{absolute // 100:,}.{absolute % 100:02d}"
