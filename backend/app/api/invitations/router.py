"""Owner endpoints for outreach status, provider discovery, and the candidate list (roadmap 08).
Secondary path: nothing here sends. Sending lives in sending.py behind explicit approval; opt-out in opt_out.py.
"""

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.api.invitations.dependencies import (
    discovery_source_dependency,
    sender_dependency,
    settings_dependency,
)
from app.api.invitations.opt_out import router as opt_out_router
from app.api.invitations.schemas import AddCandidateRequest
from app.api.invitations.sending import router as sending_router
from app.core.config import Settings
from app.core.identity import require_acting_account_id
from app.db.session import get_db
from app.services.discovery import DiscoveryRunView, DiscoverySource, discovery_run_view, run_discovery
from app.services.outreach import (
    CandidateView,
    ManualCandidateInput,
    OutreachOverview,
    OutreachSender,
    add_manual_candidate,
    get_outreach_overview,
    remove_candidate,
    view_candidate,
)

router = APIRouter(prefix="/api/invitations", tags=["invitations"])
# Sub-routers share this prefix; including them here keeps api/router.py's wiring unchanged.
router.include_router(sending_router)
router.include_router(opt_out_router)


@router.get("/listings/{listing_id}", response_model=OutreachOverview)
def get_overview(
    listing_id: str,
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(settings_dependency),
    sender: OutreachSender = Depends(sender_dependency),
    discovery_source: DiscoverySource = Depends(discovery_source_dependency),
) -> OutreachOverview:
    """Return channel, compliance, discovery, candidates, invitations, and summary for the owner's listing."""

    acting_account_id = require_acting_account_id(request)
    return get_outreach_overview(listing_id, acting_account_id, db, settings, sender, discovery_source)


@router.post("/listings/{listing_id}/discover", response_model=DiscoveryRunView)
def discover_providers(
    listing_id: str,
    request: Request,
    db: Session = Depends(get_db),
    discovery_source: DiscoverySource = Depends(discovery_source_dependency),
) -> DiscoveryRunView:
    """Run discovery once for the owner's public listing and return the recorded run; invites no one."""

    acting_account_id = require_acting_account_id(request)
    return discovery_run_view(run_discovery(listing_id, acting_account_id, db, discovery_source))


@router.post("/listings/{listing_id}/candidates", response_model=CandidateView)
def add_candidate(
    listing_id: str,
    request: Request,
    payload: AddCandidateRequest,
    db: Session = Depends(get_db),
    sender: OutreachSender = Depends(sender_dependency),
) -> CandidateView:
    """Add a provider the owner found by hand and return it with its eligibility."""

    acting_account_id = require_acting_account_id(request)
    candidate = add_manual_candidate(listing_id, acting_account_id, ManualCandidateInput(**payload.model_dump()), db)
    return view_candidate(candidate, sender, db)


@router.delete("/candidates/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete_candidate(candidate_id: str, request: Request, db: Session = Depends(get_db)) -> Response:
    """Remove a not-yet-invited candidate from the owner's list."""

    acting_account_id = require_acting_account_id(request)
    remove_candidate(candidate_id, acting_account_id, db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
