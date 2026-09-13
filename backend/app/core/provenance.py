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


class ProviderCandidateProvenance(StrEnum):
    """Enumerates where a provider candidate's details came from."""

    demo_data = "demo_data"
    public_web = "public_web"
    public_award = "public_award"
    owner_entered = "owner_entered"


class ProviderCandidateOrigin(StrEnum):
    """Enumerates how a provider candidate entered the owner's list (roadmap 08, step 4)."""

    discovered = "discovered"
    manually_added = "manually_added"
