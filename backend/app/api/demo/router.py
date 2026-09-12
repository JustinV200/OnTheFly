"""Serves the demo's honesty labels without requiring an acting account.
Public on purpose: a logged-out viewer must see the same seams as the presenter.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.services.demo.status import DemoStatus, get_demo_status

router = APIRouter(prefix="/api/demo", tags=["demo"])


@router.get("/status", response_model=DemoStatus)
def demo_status(db: Session = Depends(get_db)) -> DemoStatus:
    """Return financial-data provenance and genuine-versus-simulated offer counts."""

    return get_demo_status(get_settings().transaction_source, db)
