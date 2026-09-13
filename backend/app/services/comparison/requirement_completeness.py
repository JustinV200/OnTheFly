"""Scores scope completeness from an offer's per-requirement responses (roadmap 12, step 2).
Callers use it only when the answered scope version has requirement rows; otherwise the cleaning computation applies.
"""

from collections.abc import Mapping, Sequence

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.challenge import Challenge
from app.models.listing import ScopeVersion
from app.models.scope import ChallengeRequirementResponse, Requirement
from app.services.challenges.requirement_responses import load_current_responses
from app.services.comparison.normalize import ScopeCompletenessResult, is_scope_complete
from app.services.scope.requirements import load_requirements_by_version


class RequirementContext(BaseModel):
    """Requirement rows per answered scope version and current responses per offer, loaded once for a list."""

    requirements_by_version: dict[str, list[Requirement]]
    responses_by_challenge: dict[str, list[ChallengeRequirementResponse]]

    model_config = {"arbitrary_types_allowed": True}


def load_requirement_context(challenges: Sequence[Challenge], answered_scopes: Mapping[str, ScopeVersion], db: Session) -> RequirementContext:
    """Load everything score_scope needs for these offers in two queries."""

    return RequirementContext(
        requirements_by_version=load_requirements_by_version(list(answered_scopes.keys()), db),
        responses_by_challenge=load_current_responses([challenge.id for challenge in challenges], db),
    )


def score_scope(challenge: Challenge, answered_scope: ScopeVersion, context: RequirementContext | None) -> ScopeCompletenessResult:
    """Return completeness from responses when the answered version has requirement rows, else the existing scoring."""

    requirements = context.requirements_by_version.get(answered_scope.id, []) if context is not None else []
    if not requirements or context is None:
        return is_scope_complete(challenge, answered_scope)
    return requirement_completeness(requirements, context.responses_by_challenge.get(challenge.id, []))


def requirement_completeness(
    requirements: Sequence[Requirement],
    responses: Sequence[ChallengeRequirementResponse],
) -> ScopeCompletenessResult:
    """Score each requirement 1.0 included, 0.0 excluded, 0.5 unanswered, and average them.

    Excluded requirements are scope gaps (missing), unanswered ones need review (unstated); both are named by their
    text so the owner reads the gap before the price.
    """

    by_key = {response.requirement_key: response for response in responses}
    missing: list[str] = []
    unstated: list[str] = []
    breakdown: dict[str, float] = {}
    for requirement in requirements:
        response = by_key.get(requirement.requirement_key)
        if response is None:
            unstated.append(f"requirement:{requirement.text}")
            breakdown[requirement.requirement_key] = 0.5
        elif response.is_included:
            breakdown[requirement.requirement_key] = 1.0
        else:
            missing.append(f"requirement:{requirement.text}")
            breakdown[requirement.requirement_key] = 0.0
    scored = list(breakdown.values()) or [1.0]
    return ScopeCompletenessResult(
        score=round(sum(scored) / len(scored), 3),
        missing_items=missing,
        added_items=[],
        unstated_items=unstated,
        breakdown=breakdown,
    )
