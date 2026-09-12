"""Defines the allowed provenance labels for financial and offer records.
These enums make provenance explicit instead of implicit in source-specific code.
"""

from enum import StrEnum


class FinancialProvenance(StrEnum):
    """Enumerates where a financial record originated."""

    production = "production"
    sandbox = "sandbox"
    imported = "imported"
    fixture = "fixture"


class OfferProvenance(StrEnum):
    """Enumerates where a challenge offer originated."""

    challenger_submitted = "challenger_submitted"
    captured_off_platform = "captured_off_platform"
    demo_data = "demo_data"
