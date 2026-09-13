"""Works out a new piece's requirement rows: copies of the parent requirements the owner picked, plus rows the owner
typed in the split drawer for the piece alone. Only picked rows are assigned; added rows never touch the parent's scope.
"""

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.scope import Requirement
from app.models.tasks import Task
from app.services.scope.requirements import RequirementInput, new_requirement_key, requirement_to_input
from app.services.splitting.requirements_in_play import requirements_still_with_task


class PieceRequirements(BaseModel):
    """The piece's rows, and the (parent key, piece key) pairs that record where each picked requirement went."""

    rows: list[RequirementInput]
    assigned_key_pairs: list[tuple[str, str]]


def build_piece_requirements(
    parent: Task, picked_keys: list[str], added: list[RequirementInput], db: Session
) -> PieceRequirements:
    """Return the piece's requirement rows; raise 400 when the pick breaks a rule or the piece would have no rows.

    Every row gets a fresh key: a public key must never link the piece's listing to the parent's.
    """

    if not picked_keys and not added:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pick a requirement from this task or add one for the piece.",
        )
    chosen = _chosen_requirements(parent, picked_keys, db)

    pairs: list[tuple[str, str]] = []
    rows: list[RequirementInput] = []
    for row in chosen:
        copied = requirement_to_input(row)
        copied.key = new_requirement_key()
        copied.source = "flowed-down"
        pairs.append((row.requirement_key, copied.key))
        rows.append(copied)
    for item in added:
        # Added for this piece only: never "flowed-down", which would claim it came from the parent. An AI-drafted row the
        # owner kept stays marked llm-draft; anything else is the owner's.
        source = "llm-draft" if item.source == "llm-draft" else "owner"
        rows.append(item.model_copy(update={"key": new_requirement_key(), "source": source}))
    return PieceRequirements(rows=rows, assigned_key_pairs=pairs)


def _chosen_requirements(parent: Task, keys: list[str], db: Session) -> list[Requirement]:
    if not keys:
        return []
    if len(set(keys)) != len(keys):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A requirement can only be picked once")
    available = {row.requirement_key: row for row in requirements_still_with_task(parent, db)}
    missing = [key for key in keys if key not in available]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"{len(missing)} picked requirement(s) aren't with this task any more: each one stays with the task or "
                "goes to exactly one active piece."
            ),
        )
    if len(keys) == len(available) and parent.accepted_challenge_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Leave at least one requirement on your own listing, or unpublish it instead of splitting all of it.",
        )
    return [available[key] for key in keys]
