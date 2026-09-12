"""Provides the current registry-check stub for the MVP.
This deliberately reports not_checked rather than implying a completed lookup.
"""

from datetime import datetime, timezone

from app.models.account import Account
from app.services.evidence.check import CheckResult
from app.services.evidence.registry.base import RegistryCheck


class StubRegistryCheck(RegistryCheck):
    """Returns an explicit not_checked result until registry work is implemented."""

    def run(self, challenger_account: Account) -> CheckResult:
        """Return a named not_checked response for the registry integration stub."""

        return CheckResult(
            source="registry stub",
            checked_at=datetime.now(timezone.utc),
            status="not_checked",
            match_confidence=None,
            result={"challenger_account_id": challenger_account.id},
            limitations="Registry integration not yet implemented.",
        )
