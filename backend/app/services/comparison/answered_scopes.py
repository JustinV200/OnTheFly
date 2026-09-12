"""Loads the scope versions a set of offers answered, so each offer is scored against its own version.
It deliberately never substitutes the listing's current scope for a missing one.
"""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.challenge import Challenge
from app.models.listing import ScopeVersion


def load_answered_scopes(challenges: Sequence[Challenge], db: Session) -> dict[str, ScopeVersion]:
    """Return every scope version the given offers answered, keyed by scope version id.

    Raises LookupError when one is missing. Scoring that offer against any other version would
    retroactively reframe it (CLAUDE.md, marketplace mechanics), so a broken reference fails loudly.
    """

    scope_ids = {challenge.scope_version_id for challenge in challenges}
    if not scope_ids:
        return {}
    scopes = db.scalars(select(ScopeVersion).where(ScopeVersion.id.in_(scope_ids))).all()
    scopes_by_id = {scope.id: scope for scope in scopes}
    missing_ids = scope_ids - scopes_by_id.keys()
    if missing_ids:
        raise LookupError(f"Answered scope versions not found: {sorted(missing_ids)}")
    return scopes_by_id
