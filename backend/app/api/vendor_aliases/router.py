"""Implements owner-only vendor alias suggestion, merge, and dismiss endpoints.
Handlers parse input, call the aliases service, and map its refusals to HTTP errors.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.vendor_aliases.schemas import (
    VendorAliasDismissResponse,
    VendorAliasListResponse,
    VendorAliasMergeResponse,
    VendorAliasPairRequest,
)
from app.core.identity import require_acting_account_id
from app.db.session import get_db
from app.services.expenses.aliases import (
    AliasRequestError,
    dismiss_vendor_alias,
    merge_vendor_alias,
    suggest_vendor_aliases,
)
from app.services.flybrain import FlyBrainComponent, attribute

# Its own prefix rather than /api/expenses/..., so it can never be captured by the
# expenses router's /{expense_id} route regardless of router registration order.
router = APIRouter(prefix="/api/vendor-aliases", tags=["vendor-aliases"])


@router.get("", response_model=VendorAliasListResponse)
def list_vendor_aliases(request: Request, db: Session = Depends(get_db)) -> VendorAliasListResponse:
    """Return merge suggestions for the acting owner's vendor groups."""

    account_id = require_acting_account_id(request)
    return VendorAliasListResponse(
        suggestions=suggest_vendor_aliases(account_id, db),
        fly_brain=[
            attribute(
                FlyBrainComponent.mushroom_body_flyhash,
                "Found vendor names that look alike; exact name checks decided what to suggest.",
            )
        ],
    )


@router.post("/merge", response_model=VendorAliasMergeResponse)
def merge_vendor_alias_route(
    payload: VendorAliasPairRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> VendorAliasMergeResponse:
    """Merge one vendor group into another at the owner's explicit request."""

    account_id = require_acting_account_id(request)
    try:
        merged = merge_vendor_alias(account_id, payload.alias_expense_id, payload.canonical_expense_id, db)
    except AliasRequestError as error:
        raise _http_error(error) from error
    return VendorAliasMergeResponse(
        expense_id=merged.id,
        vendor=merged.owner_corrected_vendor or merged.normalized_vendor,
        period_count=merged.period_count,
        amount_minor_per_period=merged.amount_minor_per_period,
        currency=merged.currency,
        cadence=merged.cadence,
    )


@router.post("/dismiss", response_model=VendorAliasDismissResponse)
def dismiss_vendor_alias_route(
    payload: VendorAliasPairRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> VendorAliasDismissResponse:
    """Stop suggesting one vendor pair for the acting owner."""

    account_id = require_acting_account_id(request)
    try:
        dismissal = dismiss_vendor_alias(account_id, payload.alias_expense_id, payload.canonical_expense_id, db)
    except AliasRequestError as error:
        raise _http_error(error) from error
    return VendorAliasDismissResponse(
        alias_vendor=dismissal.alias_vendor,
        canonical_vendor=dismissal.canonical_vendor,
    )


def _http_error(error: AliasRequestError) -> HTTPException:
    status_code = status.HTTP_404_NOT_FOUND if error.is_not_found else status.HTTP_400_BAD_REQUEST
    return HTTPException(status_code=status_code, detail=str(error))
