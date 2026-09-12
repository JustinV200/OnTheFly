"""Hard exclusions: payroll, taxes, and transfers are never eligible spend and never publishable."""

from app.services.expenses.exclusions.spend_exclusion import SpendExclusionReason, classify_spend_exclusion

__all__ = ["SpendExclusionReason", "classify_spend_exclusion"]
