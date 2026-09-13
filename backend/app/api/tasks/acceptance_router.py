"""Acceptance endpoints: check what accepting an offer would do, then accept it and transfer ownership."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.tasks.schemas import AcceptOfferRequest, AcceptanceCheckResponse
from app.core.identity import require_acting_account_id
from app.db.session import get_db
from app.services.tasks.acceptance import accept_offer, check_acceptance
from app.services.tasks.access import get_participant_task
from app.services.tasks.views import TaskDetail, build_task_detail

router = APIRouter(tags=["tasks"])


@router.get("/api/tasks/{task_id}/offers/{challenge_id}/acceptance-check", response_model=AcceptanceCheckResponse)
def acceptance_check(task_id: str, challenge_id: str, request: Request, db: Session = Depends(get_db)) -> AcceptanceCheckResponse:
    """Return blocks, the above-price flag and the remainder after acceptance, without changing anything."""

    account_id = require_acting_account_id(request)
    task, _ = get_participant_task(task_id, account_id, db)
    return AcceptanceCheckResponse(**check_acceptance(task, challenge_id, account_id, db).model_dump())


@router.post("/api/tasks/{task_id}/offers/{challenge_id}/accept", response_model=TaskDetail)
def accept(
    task_id: str,
    challenge_id: str,
    payload: AcceptOfferRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TaskDetail:
    """Accept the offer as the poster. Bidding closes and the bidder becomes the task owner; returns the poster's view."""

    account_id = require_acting_account_id(request)
    task = accept_offer(task_id, challenge_id, account_id, payload.is_above_price_confirmed, db)
    return build_task_detail(task.id, account_id, db)
