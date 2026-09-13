"""Validates and stores an offer's include/exclude answer for every requirement of the scope it answers.
A revision moves the replaced version's answers onto its snapshot, so every version keeps its own (roadmap 12, step 2).
"""

from collections.abc import Sequence

from fastapi import HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.scope import ChallengeRequirementResponse
from app.services.scope.requirements import load_requirements


class RequirementResponseInput(BaseModel):
    """One requirement answered by an offer."""

    requirement_key: str = Field(min_length=1, max_length=64)
    is_included: bool
    note: str | None = Field(default=None, max_length=1000)


def validate_responses(
    scope_version_id: str,
    raw_responses: Sequence[RequirementResponseInput | dict[str, object]] | None,
    db: Session,
) -> list[RequirementResponseInput]:
    """Return the responses when they answer every requirement on the version exactly once; raise 400 otherwise.

    A version without requirement rows (a cleaning scope) takes no responses, and sending some is refused rather
    than dropped. Operator code passes dicts, which are validated here like API input.
    """

    responses = [
        item if isinstance(item, RequirementResponseInput) else RequirementResponseInput.model_validate(item)
        for item in raw_responses or []
    ]
    keys = [row.requirement_key for row in load_requirements(scope_version_id, db)]
    if not keys:
        if responses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This listing has no requirement rows, so the offer can't answer requirements.",
            )
        return []

    given = [item.requirement_key for item in responses]
    if len(set(given)) != len(given):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Answer each requirement only once.")
    unknown = set(given) - set(keys)
    if unknown:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The offer answers a requirement this listing doesn't have. Reload the listing and try again.",
        )
    unanswered = [key for key in keys if key not in set(given)]
    if unanswered:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Say whether your offer includes every requirement: {len(unanswered)} still unanswered.",
        )
    return responses


def store_current_responses(
    challenge_id: str,
    scope_version_id: str,
    responses: Sequence[RequirementResponseInput],
    db: Session,
) -> None:
    """Insert the responses as the offer's current version (challenge_revision_id None)."""

    db.add_all(
        ChallengeRequirementResponse(
            challenge_id=challenge_id,
            challenge_revision_id=None,
            scope_version_id=scope_version_id,
            requirement_key=item.requirement_key,
            is_included=item.is_included,
            note=item.note.strip() if item.note and item.note.strip() else None,
        )
        for item in responses
    )


def move_current_responses_to_revision(challenge_id: str, revision_id: str, db: Session) -> None:
    """Attach the offer's current responses to the snapshot of the version a revision replaces."""

    db.execute(
        update(ChallengeRequirementResponse)
        .where(
            ChallengeRequirementResponse.challenge_id == challenge_id,
            ChallengeRequirementResponse.challenge_revision_id.is_(None),
        )
        .values(challenge_revision_id=revision_id)
    )


def load_current_responses(challenge_ids: Sequence[str], db: Session) -> dict[str, list[ChallengeRequirementResponse]]:
    """Return each offer's current responses keyed by challenge id (an offer without any maps to [])."""

    grouped: dict[str, list[ChallengeRequirementResponse]] = {challenge_id: [] for challenge_id in challenge_ids}
    if not challenge_ids:
        return grouped
    rows = db.scalars(
        select(ChallengeRequirementResponse).where(
            ChallengeRequirementResponse.challenge_id.in_(list(challenge_ids)),
            ChallengeRequirementResponse.challenge_revision_id.is_(None),
        )
    ).all()
    for row in rows:
        grouped.setdefault(row.challenge_id, []).append(row)
    return grouped
