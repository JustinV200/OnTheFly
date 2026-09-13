"""Ways to save endpoints, for a task's current owner only: cards, refresh, dismiss or restore, and oversight cost."""

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.identity import require_acting_account_id
from app.db.session import get_db
from app.models.tasks import Task
from app.services.market_data import build_market_data_source
from app.services.savings import SavingsCardView, card_view, current_cards, refresh_cards, set_card_oversight, set_card_status
from app.services.savings.segments import build_segments
from app.services.savings.thresholds import SavingsThresholds, current_thresholds
from app.services.splitting.requirements_in_play import requirements_still_with_task
from app.services.splitting.suggested_count import active_suggested_pieces
from app.services.tasks.access import get_participant_task

router = APIRouter(tags=["ways-to-save"])


class UntaggedRequirement(BaseModel):
    """A retained requirement left out of every segment because its tags aren't confirmed."""

    key: str
    text: str


class WaysToSaveResponse(BaseModel):
    """Every card for the owner's current scope, and what couldn't be segmented."""

    task_id: str
    market_data_source: str
    cards: list[SavingsCardView]
    untagged_requirements: list[UntaggedRequirement]
    thresholds: SavingsThresholds
    active_suggested_pieces: int
    max_suggested_pieces: int


class OversightRequest(BaseModel):
    """The owner's cost to manage the piece, per the task's billing period; null clears it (the card turns provisional)."""

    oversight_minor: int | None = Field(default=None, ge=0)


@router.get("/api/tasks/{task_id}/ways-to-save", response_model=WaysToSaveResponse)
def ways_to_save(task_id: str, request: Request, db: Session = Depends(get_db)) -> WaysToSaveResponse:
    """Return the owner's cards, computing them when none exist for the current scope. Anyone else is refused."""

    account_id = require_acting_account_id(request)
    task, _ = get_participant_task(task_id, account_id, db)
    cards = current_cards(task, account_id, db)
    return _response(task, [card_view(card) for card in cards], db)


@router.post("/api/tasks/{task_id}/ways-to-save/refresh", response_model=WaysToSaveResponse)
def refresh(task_id: str, request: Request, db: Session = Depends(get_db)) -> WaysToSaveResponse:
    """Query the market-data source again and recompute every card from fresh evidence."""

    account_id = require_acting_account_id(request)
    task, _ = get_participant_task(task_id, account_id, db)
    cards = refresh_cards(task, account_id, db)
    return _response(task, [card_view(card) for card in cards], db)


@router.post("/api/savings-cards/{card_id}/dismiss", response_model=SavingsCardView)
def dismiss(card_id: str, request: Request, db: Session = Depends(get_db)) -> SavingsCardView:
    """Dismiss a suggestion; it stays dismissed for this scope version."""

    return card_view(set_card_status(card_id, require_acting_account_id(request), "dismissed", db))


@router.post("/api/savings-cards/{card_id}/restore", response_model=SavingsCardView)
def restore(card_id: str, request: Request, db: Session = Depends(get_db)) -> SavingsCardView:
    """Bring a dismissed card back to the suggestions."""

    return card_view(set_card_status(card_id, require_acting_account_id(request), "suggested", db))


@router.put("/api/savings-cards/{card_id}/oversight", response_model=SavingsCardView)
def oversight(card_id: str, payload: OversightRequest, request: Request, db: Session = Depends(get_db)) -> SavingsCardView:
    """Set or clear the oversight cost and recompute the card from its stored inputs."""

    return card_view(set_card_oversight(card_id, require_acting_account_id(request), payload.oversight_minor, db))


def _response(task: Task, cards: list[SavingsCardView], db: Session) -> WaysToSaveResponse:
    # current_cards/refresh_cards already refused anyone but the task owner, so this only shapes the answer.
    return WaysToSaveResponse(
        task_id=task.id,
        market_data_source=build_market_data_source().name,
        cards=cards,
        untagged_requirements=[
            UntaggedRequirement(key=row.requirement_key, text=row.text)
            for row in build_segments(requirements_still_with_task(task, db)).untagged
        ],
        thresholds=current_thresholds(),
        active_suggested_pieces=active_suggested_pieces(task.id, db),
        max_suggested_pieces=get_settings().max_suggested_pieces_per_task,
    )
