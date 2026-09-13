"""Lists a task's requirements and constraints for one participant, marking requirements the viewer split off.
Piece references appear only for splits the viewer itself made, so a client never learns what its owner subcontracted.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.listing import ScopeVersion
from app.models.scope import Requirement
from app.models.tasks import RequirementAssignment, Task, TaskSplit
from app.services.scope.requirements import load_constraints, load_requirements
from app.services.tasks.views.types import ConstraintRow, PieceRef, RequirementRow


def requirement_rows(task: Task, scope: ScopeVersion, account_id: str, db: Session) -> list[RequirementRow]:
    """Return the scope's requirements, plus the viewer's own active pieces' requirements it no longer covers."""

    own_pieces = _own_piece_by_key(task, account_id, db)
    rows = [_row(requirement, own_pieces.get(requirement.requirement_key)) for requirement in load_requirements(scope.id, db)]
    present = {row.key for row in rows}
    # A buyer's split before acceptance removed the requirement from the parent's newer version; show it with its piece.
    for key, piece in own_pieces.items():
        if key in present:
            continue
        restored = _latest_row(task, key, db)
        if restored is not None:
            rows.append(_row(restored, piece))
    return rows


def constraint_rows(scope: ScopeVersion, db: Session) -> list[ConstraintRow]:
    """Return the scope's constraints, saying which flowed down without naming the parent task."""

    return [
        ConstraintRow(kind=row.kind, value=row.value, is_inherited=row.inherited_from_task_id is not None)
        for row in load_constraints(scope.id, db)
    ]


def _own_piece_by_key(task: Task, account_id: str, db: Session) -> dict[str, PieceRef]:
    rows = db.execute(
        select(RequirementAssignment.requirement_key, Task.id, Task.title)
        .join(TaskSplit, TaskSplit.id == RequirementAssignment.split_id)
        .join(Task, Task.id == TaskSplit.child_task_id)
        .where(
            TaskSplit.parent_task_id == task.id,
            TaskSplit.undone_at.is_(None),
            TaskSplit.split_by_account_id == account_id,
        )
    ).all()
    return {row.requirement_key: PieceRef(task_id=row.id, title=row.title) for row in rows}


def _latest_row(task: Task, key: str, db: Session) -> Requirement | None:
    return db.scalar(
        select(Requirement)
        .join(ScopeVersion, ScopeVersion.id == Requirement.scope_version_id)
        .where(ScopeVersion.task_id == task.id, Requirement.requirement_key == key)
        .order_by(ScopeVersion.version_number.desc())
        .limit(1)
    )


def _row(requirement: Requirement, piece: PieceRef | None) -> RequirementRow:
    return RequirementRow(
        key=requirement.requirement_key,
        text=requirement.text,
        priority=requirement.priority,
        labor_category=requirement.labor_category,
        psc=requirement.psc,
        naics=requirement.naics,
        tags_status=requirement.tags_status,
        hours_estimate=requirement.hours_estimate,
        hours_status=requirement.hours_status,
        source=requirement.source,
        piece=piece,
    )
