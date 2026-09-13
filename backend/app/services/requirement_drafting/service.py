"""Runs one requirement draft for an owner and reports what happened: drafted, not run (no key), or failed.
Nothing is saved here. The rows go back to the form, and the owner's own save writes them.
"""

from app.services.requirement_drafting.drafter import DraftingError, DraftingUnavailableError, RequirementDrafter
from app.services.requirement_drafting.normalize import normalize_draft
from app.services.requirement_drafting.types import DraftRequest, DraftStatus, RequirementDraftResult


def draft_requirements(request: DraftRequest, drafter: RequirementDrafter) -> RequirementDraftResult:
    """Return the drafter's rows after code checks them. A missing key or failed request comes back as a stated status
    with no rows, never as an empty "drafted" result that would look like the model found nothing to do."""

    try:
        answer = drafter.draft(request)
    except DraftingUnavailableError as error:
        return _without_rows("not_run", str(error), drafter)
    except DraftingError as error:
        return _without_rows("failed", str(error), drafter)

    normalized = normalize_draft(answer, request.existing_requirements)
    return RequirementDraftResult(
        status="drafted",
        detail=None if normalized.requirements else "The model found no new requirements in this description.",
        requirements=normalized.requirements,
        open_questions=normalized.open_questions,
        dropped_count=normalized.dropped_count,
        model=drafter.model,
        prompt_version=drafter.prompt_version,
    )


def _without_rows(status: DraftStatus, detail: str, drafter: RequirementDrafter) -> RequirementDraftResult:
    return RequirementDraftResult(
        status=status,
        detail=detail,
        requirements=[],
        open_questions=[],
        dropped_count=0,
        model=drafter.model,
        prompt_version=drafter.prompt_version,
    )
