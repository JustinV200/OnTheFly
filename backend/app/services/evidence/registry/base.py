"""Declares the registry-check interface for external challenger evidence sources."""

from typing import Protocol

from app.models.account import Account
from app.services.evidence.check import CheckResult


class RegistryCheck(Protocol):
    """Runs one registry-backed evidence lookup for a challenger account."""

    def run(self, challenger_account: Account) -> CheckResult:
        """Return a registry evidence result for the given challenger account."""
