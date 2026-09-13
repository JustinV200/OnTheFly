"""Cost basis rate endpoints: the acting account's own private rates, never anyone else's."""

from datetime import date, datetime

from fastapi import APIRouter, Depends, Request, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.identity import require_acting_account_id
from app.db.session import get_db
from app.models.savings import CostBasisRate
from app.services.rates import RateInput, RateProvenance, add_rate, delete_rate, list_rates

router = APIRouter(prefix="/api/rates", tags=["rates"])


class RateResponse(BaseModel):
    """One of the acting account's rates, with its provenance so fixture rates read as demo data."""

    id: str
    task_id: str | None
    kind: str
    labor_category: str
    rate_minor_per_hour: int
    currency: str
    effective_date: date
    provenance: str
    created_at: datetime


class RateListResponse(BaseModel):
    """Every rate the acting account has entered or been seeded with."""

    rates: list[RateResponse]


@router.get("", response_model=RateListResponse)
def get_rates(request: Request, db: Session = Depends(get_db)) -> RateListResponse:
    """Return the acting account's rates."""

    return RateListResponse(rates=[_serialize(rate) for rate in list_rates(require_acting_account_id(request), db)])


@router.post("", response_model=RateResponse)
def create_rate(payload: RateInput, request: Request, db: Session = Depends(get_db)) -> RateResponse:
    """Add an owner-entered rate; the account's Ways to save cards become stale and recompute."""

    return _serialize(add_rate(require_acting_account_id(request), payload, RateProvenance.owner_entered, db))


@router.delete("/{rate_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def remove_rate(rate_id: str, request: Request, db: Session = Depends(get_db)) -> Response:
    """Delete one of the acting account's rates."""

    delete_rate(require_acting_account_id(request), rate_id, db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _serialize(rate: CostBasisRate) -> RateResponse:
    return RateResponse(
        id=rate.id,
        task_id=rate.task_id,
        kind=rate.kind,
        labor_category=rate.labor_category,
        rate_minor_per_hour=rate.rate_minor_per_hour,
        currency=rate.currency,
        effective_date=rate.effective_date,
        provenance=rate.provenance,
        created_at=rate.created_at,
    )
