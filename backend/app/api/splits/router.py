"""Split endpoints: split a piece off a task you own, and undo a split while it can still be undone."""

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.identity import require_acting_account_id
from app.db.session import get_db
from app.services.splitting.create import SplitRequest, split_off_piece
from app.services.splitting.undo import undo_split
from app.services.tasks.views import TaskDetail, build_task_detail

router = APIRouter(tags=["splits"])


class SplitResponse(BaseModel):
    """The new split, the private piece it created, and the parent task as its owner now sees it."""

    split_id: str
    child_task_id: str
    parent: TaskDetail


@router.post("/api/tasks/{task_id}/splits", response_model=SplitResponse)
def create_split(task_id: str, payload: SplitRequest, request: Request, db: Session = Depends(get_db)) -> SplitResponse:
    """Split off a private piece. Only the task's current owner can; the piece publishes through its own preview."""

    account_id = require_acting_account_id(request)
    split = split_off_piece(task_id, account_id, payload, db)
    return SplitResponse(split_id=split.id, child_task_id=split.child_task_id, parent=build_task_detail(task_id, account_id, db))


@router.post("/api/splits/{split_id}/undo", response_model=TaskDetail)
def undo(split_id: str, request: Request, db: Session = Depends(get_db)) -> TaskDetail:
    """Undo a split: the cut and requirements return, the piece's listing closes, and its offers are kept."""

    account_id = require_acting_account_id(request)
    split = undo_split(split_id, account_id, db)
    return build_task_detail(split.parent_task_id, account_id, db)
