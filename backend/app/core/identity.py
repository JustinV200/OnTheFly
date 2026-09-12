"""Resolves the acting account from request headers for demo-only identity.
This module does not implement real authentication or session management.
"""

from fastapi import HTTPException, Request, status


HEADER_NAME = "X-Account-ID"


def get_acting_account_id(request: Request) -> str | None:
    """Return the acting account id from headers, or None when absent."""

    return request.headers.get(HEADER_NAME)


def require_acting_account_id(request: Request) -> str:
    """Return the acting account id or raise a 401 for missing identity."""

    acting_account_id = get_acting_account_id(request)
    if not acting_account_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-Account-ID header",
        )
    return acting_account_id
