"""Writes requirement and constraint rows onto a scope version.
Rows are only ever inserted for a fresh version; an earlier version's rows are never edited, so offers keep their scope.
"""

from collections.abc import Sequence
import uuid

from sqlalchemy.orm import Session

from app.models.scope import Requirement, ScopeConstraint
from app.services.scope.requirements.types import ConstraintInput, RequirementInput


class DuplicateRequirementKeyError(ValueError):
    """Raised when two requirements on one version share a key."""


def write_requirements(scope_version_id: str, requirements: Sequence[RequirementInput], db: Session) -> list[Requirement]:
    """Insert requirement rows in the given order and return them.

    A requirement without a key gets a fresh one; a supplied key is kept, which is how a key stays stable
    across versions of one task. Raises DuplicateRequirementKeyError before inserting anything.
    """

    keys = [requirement.key or new_requirement_key() for requirement in requirements]
    if len(set(keys)) != len(keys):
        raise DuplicateRequirementKeyError("Each requirement on a scope version needs its own key")

    rows = [
        Requirement(
            scope_version_id=scope_version_id,
            requirement_key=key,
            position=position,
            text=requirement.text,
            priority=requirement.priority,
            labor_category=requirement.labor_category,
            psc=requirement.psc,
            naics=requirement.naics,
            tags_status=requirement.tags_status,
            hours_estimate=requirement.hours_estimate,
            hours_status=requirement.hours_status,
            source=requirement.source,
        )
        for position, (key, requirement) in enumerate(zip(keys, requirements, strict=True))
    ]
    db.add_all(rows)
    db.flush()
    return rows


def write_constraints(scope_version_id: str, constraints: Sequence[ConstraintInput], db: Session) -> list[ScopeConstraint]:
    """Insert constraint rows in the given order and return them."""

    rows = [
        ScopeConstraint(
            scope_version_id=scope_version_id,
            position=position,
            kind=constraint.kind,
            value=constraint.value,
            inherited_from_task_id=constraint.inherited_from_task_id,
        )
        for position, constraint in enumerate(constraints)
    ]
    db.add_all(rows)
    db.flush()
    return rows


def new_requirement_key() -> str:
    """Return a fresh opaque requirement key.

    Opaque on purpose: a piece's requirements get fresh keys too, so a public key can never link a piece's
    listing back to the parent task's listing (CLAUDE.md, "Nothing upstream appears in a piece's public projection").
    """

    return f"req_{uuid.uuid4().hex[:10]}"
