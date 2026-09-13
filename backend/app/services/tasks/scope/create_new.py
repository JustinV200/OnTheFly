"""Creates a new task: work with no current vendor, scoped by its owner, with an optional budget (roadmap 12, step 3).
The task and its listing record start private; publishing goes through confirmation and the exact preview.
"""

from sqlalchemy.orm import Session

from app.core.task_lifecycle import TaskOrigin, TaskState
from app.models.tasks import Task
from app.services.tasks.events import write_task_event
from app.services.tasks.scope.private_listing import create_private_task_listing
from app.services.tasks.scope.types import TaskScopeDraft
from app.services.tasks.scope.write_version import ScopeVersionContent, validate_category_fields, write_task_scope_version


def create_new_task(poster_account_id: str, draft: TaskScopeDraft, db: Session) -> Task:
    """Create a private new task posted and owned by the acting account, with scope version 1 and a private listing."""

    category_fields_json = validate_category_fields(draft.category, draft.category_fields)
    task = Task(
        origin=TaskOrigin.new.value,
        posted_by_account_id=poster_account_id,
        owner_account_id=poster_account_id,
        depth=0,
        state=TaskState.private.value,
        title=draft.title,
        category=draft.category,
        currency=draft.currency,
        billing_period=draft.billing_period,
    )
    db.add(task)
    db.flush()
    scope = write_task_scope_version(
        task,
        ScopeVersionContent(
            requirements=draft.requirements,
            constraints=draft.constraints,
            price_minor=draft.price_minor,
            category_fields_json=category_fields_json,
            service_area=draft.service_area,
            challenge_deadline=draft.challenge_deadline,
        ),
        db,
    )
    create_private_task_listing(task, scope, db)
    write_task_event(task.id, poster_account_id, "created", {"origin": TaskOrigin.new.value}, db)
    db.commit()
    db.refresh(task)
    return task
