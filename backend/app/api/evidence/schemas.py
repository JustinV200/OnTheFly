"""Response schemas for challenger evidence endpoints."""

from datetime import datetime

from pydantic import BaseModel

from app.services.evidence.check import CheckResult


class ChallengerEvidenceResponse(BaseModel):
    """Represents the parsed evidence bundle for one challenge."""

    challenge_id: str
    challenger_account_id: str
    platform_check: CheckResult
    identity_check: CheckResult
    registry_check: CheckResult
    last_updated: datetime
