"""Defines the shared API error envelope and FastAPI exception handlers.
Handlers stay explicit so missing state never looks like a successful default.
"""

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException


class ErrorEnvelope(BaseModel):
    """Represents the standard error body returned by the API."""

    error: str
    detail: str | None = None


async def handle_http_exception(
    _request: Request,
    exc: StarletteHTTPException,
) -> JSONResponse:
    """Return a structured error response for handled HTTP exceptions."""

    labels = {
        status.HTTP_400_BAD_REQUEST: "bad_request",
        status.HTTP_401_UNAUTHORIZED: "unauthorized",
        status.HTTP_404_NOT_FOUND: "not_found",
        status.HTTP_409_CONFLICT: "conflict",
        status.HTTP_503_SERVICE_UNAVAILABLE: "service_unavailable",
    }
    label = labels.get(exc.status_code, "http_error")
    envelope = ErrorEnvelope(error=label, detail=str(exc.detail))
    return JSONResponse(status_code=exc.status_code, content=envelope.model_dump())


async def handle_unexpected_exception(_request: Request, exc: Exception) -> JSONResponse:
    """Return a structured 500 response for unexpected server failures."""

    envelope = ErrorEnvelope(error="internal_server_error", detail=str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=envelope.model_dump(),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Attach the shared exception handlers to the FastAPI application."""

    app.add_exception_handler(StarletteHTTPException, handle_http_exception)
    app.add_exception_handler(HTTPException, handle_http_exception)
    app.add_exception_handler(Exception, handle_unexpected_exception)
