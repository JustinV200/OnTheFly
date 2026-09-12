"""Defines the shared evidence check result schema.
The status vocabulary keeps not_checked distinct from no_match_found.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class CheckResult(BaseModel):
    """Represents one named evidence check and its limitations."""

    source: str
    checked_at: datetime
    status: Literal["matched", "no_match_found", "uncertain", "not_checked", "unavailable"]
    match_confidence: Literal["confirmed", "probable", "uncertain", "no_match"] | None
    result: dict | None
    limitations: str
