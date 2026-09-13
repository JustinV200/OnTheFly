"""Public opt-out endpoints behind the link in every invitation footer. No account is needed.
They return only a masked address and the opt-out state, never listing, business, or recipient details.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.outreach import OptOutDescription, OptOutResult, apply_opt_out, describe_opt_out

router = APIRouter()


@router.get("/opt-out/{token}", response_model=OptOutDescription)
def get_opt_out(token: str, db: Session = Depends(get_db)) -> OptOutDescription:
    """Describe the address this link opts out, so the page can confirm before the click."""

    return describe_opt_out(token, db)


@router.post("/opt-out/{token}", response_model=OptOutResult)
def post_opt_out(token: str, db: Session = Depends(get_db)) -> OptOutResult:
    """Opt the address out of all future invitations; repeating the request is harmless."""

    return apply_opt_out(token, db)
