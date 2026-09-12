"""Builds and persists the latest challenger evidence bundle for one challenge.
Checks stay separate so the UI can name what was and was not actually run.
"""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.challenge import Challenge
from app.models.challenger_evidence import ChallengerEvidence
from app.services.evidence.identity import ChallengerIdentifiers, match_identity
from app.services.evidence.platform import get_platform_evidence
from app.services.evidence.registry.stub import StubRegistryCheck



def get_or_refresh_challenger_evidence(challenge: Challenge, db: Session) -> ChallengerEvidence:
    """Create or refresh the evidence bundle stored for one challenge."""

    challenger = db.get(Account, challenge.challenger_account_id)
    if challenger is None:
        raise ValueError("Challenge challenger account was not found")

    platform_check = get_platform_evidence(challenge.challenger_account_id, db)
    # No source returns external business records yet (the registry check is a stub) and
    # accounts carry no registration number, so the matcher honestly reports not_checked.
    # Once a registry source lands, pass its record here instead of None.
    identity_check = match_identity(
        ChallengerIdentifiers(
            legal_name=challenger.business_name,
            location=challenger.service_area,
            registration_number=None,
        ),
        record=None,
    )
    registry_check = StubRegistryCheck().run(challenger)
    stored = db.scalar(
        select(ChallengerEvidence).where(ChallengerEvidence.challenge_id == challenge.id)
    )
    if stored is None:
        stored = ChallengerEvidence(
            challenge_id=challenge.id,
            challenger_account_id=challenge.challenger_account_id,
            platform_check=platform_check.model_dump_json(),
            identity_check=identity_check.model_dump_json(),
            registry_check=registry_check.model_dump_json(),
            last_updated=datetime.now(timezone.utc),
        )
        db.add(stored)
    else:
        stored.platform_check = platform_check.model_dump_json()
        stored.identity_check = identity_check.model_dump_json()
        stored.registry_check = registry_check.model_dump_json()
        stored.last_updated = datetime.now(timezone.utc)
    db.commit()
    db.refresh(stored)
    return stored
