"""Requirement drafting (plan2, "Model and code boundaries"): a model drafts requirement rows, tags and hours from the
owner's own description; code checks every row; the owner confirms before anything is saved."""

from app.services.requirement_drafting.drafter import DraftingError, DraftingUnavailableError, RequirementDrafter
from app.services.requirement_drafting.factory import get_requirement_drafter
from app.services.requirement_drafting.service import draft_requirements
from app.services.requirement_drafting.types import DraftRequest, ModelDraft, ModelRequirement, RequirementDraftResult

__all__ = [
    "DraftRequest",
    "DraftingError",
    "DraftingUnavailableError",
    "ModelDraft",
    "ModelRequirement",
    "RequirementDraftResult",
    "RequirementDrafter",
    "draft_requirements",
    "get_requirement_drafter",
]
