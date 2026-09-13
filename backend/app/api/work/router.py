"""My work: tasks the acting business owns through accepted offers, and tasks it posted, each with its money view."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.identity import require_acting_account_id
from app.db.session import get_db
from app.services.tasks.views import WorkResponse, build_work

router = APIRouter(tags=["work"])


@router.get("/api/work", response_model=WorkResponse)
def my_work(request: Request, db: Session = Depends(get_db)) -> WorkResponse:
    """Return My work for the acting business."""

    return build_work(require_acting_account_id(request), db)
