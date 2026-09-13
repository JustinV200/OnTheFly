"""Writes the one-line public scope summary for a listing built from requirement rows.
Cleaning listings without requirement rows keep their own summary in services/listings/projection.py.
"""

from app.services.listings.types import PublicConstraint, PublicRequirement


def summarize_requirements(
    area: str | None,
    requirements: list[PublicRequirement],
    constraints: list[PublicConstraint],
) -> str:
    """Return "area · N requirements · H hours · constraints", naming what isn't specified rather than omitting it."""

    count = len(requirements)
    parts = [area or "Location not specified", f"{count} requirement{'' if count == 1 else 's'}"]
    hours = [requirement.hours for requirement in requirements]
    if hours and all(value is not None for value in hours):
        parts.append(f"{sum(value for value in hours if value is not None):,} hours")
    elif hours:
        parts.append("Hours partly unanswered")
    parts.extend(f"{constraint.kind.replace('_', '-')}: {constraint.value}" for constraint in constraints)
    return " · ".join(parts)
