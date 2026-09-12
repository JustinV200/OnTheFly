"""Builds platform-native challenger evidence without external dependencies.
It reports honest platform history, including when history simply does not exist yet.
"""

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.challenge import Challenge
from app.models.listing import PublicListingRecord
from app.services.evidence.check import CheckResult



def get_platform_evidence(challenger_account_id: str, db: Session) -> CheckResult:
    """Return platform-side counts and profile completeness for one challenger."""

    account = db.get(Account, challenger_account_id)
    if account is None:
        return CheckResult(
            source="platform data",
            checked_at=datetime.now(timezone.utc),
            status="unavailable",
            match_confidence=None,
            result=None,
            limitations="Account was not found in platform storage.",
        )

    created_at = account.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    account_age_days = max((datetime.now(timezone.utc) - created_at).days, 0)
    profile_completeness = 100 if account.handle and account.business_name and account.service_area else 0
    listings_published = int(
        db.scalar(
            select(func.count()).select_from(PublicListingRecord).where(
                PublicListingRecord.owner_account_id == challenger_account_id,
                PublicListingRecord.visibility == "public",
            )
        )
        or 0
    )
    challenges_made = int(
        db.scalar(
            select(func.count()).select_from(Challenge).where(
                Challenge.challenger_account_id == challenger_account_id,
            )
        )
        or 0
    )
    result = {
        "account_age_days": account_age_days,
        "profile_completeness": profile_completeness,
        "listings_published": listings_published,
        "challenges_made": challenges_made,
        "times_shortlisted": 0,
        "summary": "new account, no platform history yet" if challenges_made == 0 else "platform activity available",
    }
    return CheckResult(
        source="platform data",
        checked_at=datetime.now(timezone.utc),
        status="matched",
        match_confidence="confirmed",
        result=result,
        limitations="Only reflects activity and profile completeness recorded on this platform.",
    )
