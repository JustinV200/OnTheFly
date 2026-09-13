"""Works out which requirements a task still covers and which already went to an active piece.
Every requirement stays with the task or goes to exactly one active piece (CLAUDE.md, task ownership and splitting).
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.listing import ScopeVersion
from app.models.scope import Requirement
from app.models.tasks import RequirementAssignment, Task, TaskSplit
from app.services.scope.requirements import load_requirements
from app.services.tasks.access import listing_for_task


def splittable_scope_version(task: Task, db: Session) -> ScopeVersion | None:
    """Return the scope a split draws from: the accepted scope after acceptance, the listing's current one before."""

    if task.accepted_scope_version_id is not None:
        return db.get(ScopeVersion, task.accepted_scope_version_id)
    listing = listing_for_task(task.id, db)
    return db.get(ScopeVersion, listing.scope_version_id) if listing is not None else None


def assigned_requirement_keys(task: Task, db: Session) -> dict[str, str]:
    """Return {parent requirement key: split id} for every active split of the task, before or after acceptance."""

    rows = db.execute(
        select(RequirementAssignment.requirement_key, RequirementAssignment.split_id)
        .join(TaskSplit, TaskSplit.id == RequirementAssignment.split_id)
        .where(TaskSplit.parent_task_id == task.id, TaskSplit.undone_at.is_(None))
    ).all()
    return {row.requirement_key: row.split_id for row in rows}


def requirements_still_with_task(task: Task, db: Session) -> list[Requirement]:
    """Return the requirement rows on the splittable scope that no active piece has taken."""

    scope = splittable_scope_version(task, db)
    if scope is None:
        return []
    assigned = assigned_requirement_keys(task, db)
    return [row for row in load_requirements(scope.id, db) if row.requirement_key not in assigned]


def keys_covered_by_pieces(scope_version_id: str, task: Task, db: Session) -> list[str]:
    """Return the requirement keys on a scope version that an active piece of the task now covers.

    An offer that answered such a version can't be accepted: accepting it would double-cover those requirements.
    """

    assigned = assigned_requirement_keys(task, db)
    return [row.requirement_key for row in load_requirements(scope_version_id, db) if row.requirement_key in assigned]
