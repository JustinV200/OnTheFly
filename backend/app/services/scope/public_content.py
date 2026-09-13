"""Builds the public requirement, constraint and template-field lists for one scope version, field by field.
It reads only that version's own rows, never a parent task's, and copies only the fields bidders may see.
"""

import json

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.listing import ScopeVersion
from app.services.listings.types import PublicConstraint, PublicRequirement, PublicScopeField
from app.services.scope.requirements import load_constraints, load_requirements
from app.services.scope.templates import template_for


class PublicScopeContent(BaseModel):
    """The public parts of one scope version beyond the listing's scalar fields."""

    title: str | None
    requirements: list[PublicRequirement]
    constraints: list[PublicConstraint]
    scope_fields: list[PublicScopeField]


def build_public_scope_content(scope: ScopeVersion, category: str, title: str | None, db: Session) -> PublicScopeContent:
    """Return the public content of a scope version.

    Deliberately omitted: requirement tags status, hours status, PSC/NAICS, source, and a constraint's
    inherited_from_task_id, which would name the parent task on a piece.
    """

    return PublicScopeContent(
        title=title,
        requirements=[
            PublicRequirement(
                key=row.requirement_key,
                text=row.text,
                priority=row.priority,
                labor_category=row.labor_category,
                hours=row.hours_estimate,
            )
            for row in load_requirements(scope.id, db)
        ],
        constraints=[PublicConstraint(kind=row.kind, value=row.value) for row in load_constraints(scope.id, db)],
        scope_fields=template_for(category).public_fields(scope.category_fields),
    )


def dump_public_content_columns(content: PublicScopeContent) -> dict[str, str]:
    """Return the JSON column values a PublicListingRecord stores for this content."""

    return {
        "requirements_json": json.dumps([item.model_dump() for item in content.requirements]),
        "constraints_json": json.dumps([item.model_dump() for item in content.constraints]),
        "scope_fields_json": json.dumps([item.model_dump() for item in content.scope_fields]),
    }
