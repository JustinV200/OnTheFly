"""Requirement draft endpoint: an acting business asks a model to draft requirement rows from its own description.
The handler only builds the configured drafter and returns the service's result; nothing is saved or published.
"""

from fastapi import APIRouter, Depends, Request

from app.core.config import get_settings
from app.core.identity import require_acting_account_id
from app.services.requirement_drafting import (
    DraftRequest,
    RequirementDraftResult,
    RequirementDrafter,
    draft_requirements,
    get_requirement_drafter,
)

router = APIRouter(tags=["requirement-drafts"])


def requirement_drafter_dependency() -> RequirementDrafter:
    """Return the configured drafter; a dependency so tests can override it without a key or network."""

    return get_requirement_drafter(get_settings())


@router.post("/api/requirement-drafts", response_model=RequirementDraftResult)
def create_requirement_draft(
    payload: DraftRequest, request: Request, drafter: RequirementDrafter = Depends(requirement_drafter_dependency)
) -> RequirementDraftResult:
    """Draft requirement rows for the owner to review. Needs an acting business, so an anonymous visitor can't spend
    model calls; the draft is returned, never stored."""

    require_acting_account_id(request)
    return draft_requirements(payload, drafter)
