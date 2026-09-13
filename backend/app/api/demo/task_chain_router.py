"""Presenter controls for the GovCon task-chain demo: list the stages, stage one, and fetch the REBID demo scope.
Available only while DEMO_CONTROLS_ENABLED is true. Staging resets the chain's data, so it is never on by accident.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.services.demo.task_chain import STAGE_ORDER, GenuineOfferPresentError, Stage, StagedChain, stage_task_chain
from app.services.demo.task_chain.drafts import devsecops_rebid_draft, zero_trust_new_task_draft
from app.services.tasks.scope.types import TaskScopeDraft

# No prefix of its own: api/demo/router.py includes it under /api/demo, and prefixes stack.
router = APIRouter(tags=["demo"])


class TaskChainControls(BaseModel):
    """Whether presenter controls are on, and the stages in order."""

    is_enabled: bool
    stages: list[str]


class StageRequest(BaseModel):
    """The point to stage the demo at; every earlier step is replayed first."""

    stage: Stage


@router.get("/task-chain", response_model=TaskChainControls)
def controls() -> TaskChainControls:
    """Return whether staging is available and the stage names."""

    return TaskChainControls(is_enabled=get_settings().demo_controls_enabled, stages=list(STAGE_ORDER))


@router.post("/task-chain/stage", response_model=StagedChain)
def stage(payload: StageRequest, db: Session = Depends(get_db)) -> StagedChain:
    """Reset the GovCon task chain and replay it up to the requested stage through the real services."""

    if not get_settings().demo_controls_enabled:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Demo controls are turned off (DEMO_CONTROLS_ENABLED=false)")
    try:
        return stage_task_chain(payload.stage, db)
    except GenuineOfferPresentError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error


@router.get("/task-chain/rebid-template", response_model=TaskScopeDraft)
def rebid_template() -> TaskScopeDraft:
    """Return GovCon's demo DevSecOps scope, so the live REBID form can be filled in one click and still reviewed."""

    return devsecops_rebid_draft()


@router.get("/task-chain/new-task-template", response_model=TaskScopeDraft)
def new_task_template() -> TaskScopeDraft:
    """Return the demo's example new task (work with no current vendor), to fill the new-task form for review."""

    return zero_trust_new_task_draft()
