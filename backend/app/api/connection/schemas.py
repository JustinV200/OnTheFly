"""Response schemas for the acting account's connection and import endpoints."""

from pydantic import BaseModel


class ImportResultResponse(BaseModel):
    """Summarizes one import run's new, duplicate, excluded, and failed counts."""

    new: int
    duplicate: int
    excluded: int
    failed: int
