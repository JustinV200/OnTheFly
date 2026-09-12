"""Performs deterministic challenger identity matching against platform account data.
It never uses model output and only reveals adverse detail on confirmed matches.
"""

from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.account import Account
from app.services.evidence.check import CheckResult



def match_identity(challenger_account: Account, db: Session) -> CheckResult:
    """Return a deterministic identity-match result for one challenger account."""

    exact = db.get(Account, challenger_account.id)
    if exact is not None:
        result = {
            "matched_account_id": exact.id,
            "business_name": exact.business_name,
            "service_area": exact.service_area,
        }
        adverse_record = getattr(challenger_account, "confirmed_adverse_record", None)
        if adverse_record is not None:
            result["adverse_record"] = adverse_record
        return CheckResult(
            source="platform identity",
            checked_at=datetime.now(timezone.utc),
            status="matched",
            match_confidence="confirmed",
            result=result,
            limitations="Matched only against platform-held identifiers and profile fields.",
        )

    probable = db.scalar(
        select(Account).where(
            or_(
                Account.handle == challenger_account.handle,
                Account.business_name == challenger_account.business_name,
            )
        )
    )
    if probable is not None:
        return CheckResult(
            source="platform identity",
            checked_at=datetime.now(timezone.utc),
            status="uncertain",
            match_confidence="uncertain",
            result={
                "possible_account_id": probable.id,
                "business_name": probable.business_name,
            },
            limitations="Possible match requires identifier-level confirmation before adverse data can be shown.",
        )

    return CheckResult(
        source="platform identity",
        checked_at=datetime.now(timezone.utc),
        status="no_match_found",
        match_confidence="no_match",
        result=None,
        limitations="No platform account matched the provided identifiers.",
    )
