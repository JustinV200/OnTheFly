"""Writes the next scope version of a task, with its requirement rows, constraints and template fields.
Earlier versions and their rows are never touched, so an offer keeps the scope it answered.
"""

from datetime import datetime

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.listing import ScopeVersion
from app.models.tasks import Task
from app.services.scope.requirements import (
    ConstraintInput,
    DuplicateRequirementKeyError,
    RequirementInput,
    constraint_to_input,
    load_constraints,
    load_requirements,
    requirement_to_input,
    write_constraints,
    write_requirements,
)
from app.services.scope.templates import TemplateFieldsError, template_for


class ScopeVersionContent(BaseModel):
    """Everything a new scope version stores. category_fields_json is already validated by the category template."""

    requirements: list[RequirementInput]
    constraints: list[ConstraintInput]
    price_minor: int | None
    category_fields_json: str | None
    service_area: str | None
    challenge_deadline: datetime | None
    incumbent_vendor_name: str | None = None


def validate_category_fields(category: str, raw: object | None) -> str | None:
    """Return the category template's stored JSON for raw fields; raise 400 when the template rejects them."""

    try:
        return template_for(category).parse_fields(raw)
    except TemplateFieldsError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error


def write_task_scope_version(task: Task, content: ScopeVersionContent, db: Session) -> ScopeVersion:
    """Insert the task's next scope version and its rows; raise 400 for duplicate requirement keys.

    The price is stored in the task's own currency and billing period, the only pair a task is priced in.
    """

    scope = ScopeVersion(
        expense_id=task.expense_id,
        task_id=task.id,
        version_number=_next_version_number(task, db),
        service_area=content.service_area,
        location_approximate=content.service_area,
        current_price_minor=content.price_minor,
        current_price_currency=task.currency,
        billing_cadence=task.billing_period,
        challenge_deadline=content.challenge_deadline,
        incumbent_vendor_name=content.incumbent_vendor_name,
        category_fields=content.category_fields_json,
    )
    db.add(scope)
    db.flush()
    try:
        write_requirements(scope.id, content.requirements, db)
    except DuplicateRequirementKeyError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    write_constraints(scope.id, content.constraints, db)
    return scope


def content_of_version(scope: ScopeVersion, db: Session) -> ScopeVersionContent:
    """Return a stored version's content, so a service can write a changed copy (a split, an undo) from it."""

    return ScopeVersionContent(
        requirements=[requirement_to_input(row) for row in load_requirements(scope.id, db)],
        constraints=[constraint_to_input(row) for row in load_constraints(scope.id, db)],
        price_minor=scope.current_price_minor,
        category_fields_json=scope.category_fields,
        service_area=scope.service_area or scope.location_approximate,
        challenge_deadline=scope.challenge_deadline,
        incumbent_vendor_name=scope.incumbent_vendor_name,
    )


def _next_version_number(task: Task, db: Session) -> int:
    # A rebid numbers its versions per expense, as the expense publish flow always has; other tasks per task.
    column_filter = (
        ScopeVersion.expense_id == task.expense_id if task.expense_id is not None else ScopeVersion.task_id == task.id
    )
    current = db.scalar(select(func.coalesce(func.max(ScopeVersion.version_number), 0)).where(column_filter))
    return int(current or 0) + 1
