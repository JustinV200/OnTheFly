"""Stages an audited task event. It only adds the row; the calling service owns the flush or commit."""

import json

from sqlalchemy.orm import Session

from app.models.tasks import TaskEvent

# The detail values an event may carry: ids, amounts in minor units, labels, and lists of keys.
EventDetail = dict[str, str | int | bool | None | list[str]]


def write_task_event(task_id: str, account_id: str, kind: str, detail: EventDetail, db: Session) -> TaskEvent:
    """Record who did what to a task, with a JSON detail; changed_at is stamped by the model default."""

    event = TaskEvent(task_id=task_id, account_id=account_id, kind=kind, detail_json=json.dumps(detail, sort_keys=True))
    db.add(event)
    return event
