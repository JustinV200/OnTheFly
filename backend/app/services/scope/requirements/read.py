"""Loads the requirement and constraint rows of a scope version, in their confirmed order."""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.scope import Requirement, ScopeConstraint
from app.services.scope.requirements.types import ConstraintInput, RequirementInput


def load_requirements(scope_version_id: str, db: Session) -> list[Requirement]:
    """Return one version's requirement rows ordered by position; empty for a version with none (e.g. cleaning)."""

    return list(
        db.scalars(
            select(Requirement).where(Requirement.scope_version_id == scope_version_id).order_by(Requirement.position)
        ).all()
    )


def load_constraints(scope_version_id: str, db: Session) -> list[ScopeConstraint]:
    """Return one version's constraint rows ordered by position."""

    return list(
        db.scalars(
            select(ScopeConstraint)
            .where(ScopeConstraint.scope_version_id == scope_version_id)
            .order_by(ScopeConstraint.position)
        ).all()
    )


def load_requirements_by_version(scope_version_ids: Sequence[str], db: Session) -> dict[str, list[Requirement]]:
    """Return requirement rows for many versions in one query, keyed by version id (missing versions map to [])."""

    grouped: dict[str, list[Requirement]] = {version_id: [] for version_id in scope_version_ids}
    if not scope_version_ids:
        return grouped
    rows = db.scalars(
        select(Requirement)
        .where(Requirement.scope_version_id.in_(list(scope_version_ids)))
        .order_by(Requirement.scope_version_id, Requirement.position)
    ).all()
    for row in rows:
        grouped.setdefault(row.scope_version_id, []).append(row)
    return grouped


def requirement_to_input(row: Requirement) -> RequirementInput:
    """Return a stored row as the input shape, key included, so a new version can carry it over unchanged."""

    return RequirementInput(
        key=row.requirement_key,
        text=row.text,
        priority=row.priority,  # type: ignore[arg-type]  # stored values were validated on the way in
        labor_category=row.labor_category,
        psc=row.psc,
        naics=row.naics,
        tags_status=row.tags_status,  # type: ignore[arg-type]
        hours_estimate=row.hours_estimate,
        hours_status=row.hours_status,  # type: ignore[arg-type]
        source=row.source,  # type: ignore[arg-type]
    )


def constraint_to_input(row: ScopeConstraint) -> ConstraintInput:
    """Return a stored constraint as the input shape, keeping where it flowed down from."""

    return ConstraintInput(
        kind=row.kind,  # type: ignore[arg-type]  # stored values were validated on the way in
        value=row.value,
        inherited_from_task_id=row.inherited_from_task_id,
    )
