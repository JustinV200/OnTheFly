"""Returns explicit 501 responses for outbound invitation endpoints.
Secondary path — seeding marketplace supply. Not part of the demo critical path.
"""

from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/api/invitations", tags=["invitations"])


@router.get("")
def get_invitations() -> None:
    """Return a visible 501 until invitation review and sending are implemented."""

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Secondary path — seeding marketplace supply. Not part of the demo critical path.",
    )


@router.post("")
def post_invitation() -> None:
    """Return a visible 501 until invitation sending is intentionally implemented."""

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Secondary path — seeding marketplace supply. Not part of the demo critical path.",
    )
