"""Carries a parent's constraints into a new piece. They flow down by default; the owner may drop some, explicitly.
A dropped constraint is refused unless acknowledged, and every drop is audited by the caller (plan2, "Flow-down").
"""

from pydantic import BaseModel

from app.models.scope import ScopeConstraint
from app.services.scope.requirements import ConstraintInput


class ConstraintRef(BaseModel):
    """Names one constraint by kind and value."""

    kind: str
    value: str


class FlowDownResult(BaseModel):
    """The constraints the piece inherits and the ones the owner removed."""

    inherited: list[ConstraintInput]
    removed: list[ConstraintRef]


class UnacknowledgedRemovalError(ValueError):
    """Raised when a constraint would be dropped without the owner acknowledging the warning."""


def flow_down_constraints(
    parent_task_id: str,
    parent_constraints: list[ScopeConstraint],
    removed: list[ConstraintRef],
    is_removal_acknowledged: bool,
) -> FlowDownResult:
    """Return the piece's inherited constraints, each marked with the parent it came from.

    Raises UnacknowledgedRemovalError when any removal lacks acknowledgement. A removal naming a constraint the
    parent doesn't have is ignored rather than recorded, so the audit trail only shows real removals.
    """

    removed_pairs = {(ref.kind, ref.value) for ref in removed}
    real_removals = [
        ConstraintRef(kind=row.kind, value=row.value) for row in parent_constraints if (row.kind, row.value) in removed_pairs
    ]
    if real_removals and not is_removal_acknowledged:
        names = ", ".join(f"{ref.kind.replace('_', '-')}: {ref.value}" for ref in real_removals)
        raise UnacknowledgedRemovalError(
            f"Removing an inherited constraint ({names}) means bidders on the piece are no longer told to meet it. "
            "Confirm the removal to continue."
        )
    return FlowDownResult(
        inherited=[
            ConstraintInput(kind=row.kind, value=row.value, inherited_from_task_id=parent_task_id)  # type: ignore[arg-type]
            for row in parent_constraints
            if (row.kind, row.value) not in removed_pairs
        ],
        removed=real_removals,
    )
