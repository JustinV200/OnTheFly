"""Re-exports SQLAlchemy models so metadata registration is explicit."""

from app.models.account import Account
from app.models.challenge import Challenge, ChallengeRevision
from app.models.challenger_evidence import ChallengerEvidence
from app.models.financial_connection import FinancialConnection
from app.models.listing import PublicListingRecord, ScopeVersion
from app.models.outreach import (
    DiscoveryRun,
    Invitation,
    InvitationApproval,
    OutreachSuppression,
    ProviderCandidate,
    SandboxOutboxMessage,
)
from app.models.savings import CostBasisRate, MarketEvidence, SavingsCard
from app.models.scope import ChallengeRequirementResponse, Requirement, ScopeConstraint
from app.models.service_expense import ServiceExpense
from app.models.tasks import RequirementAssignment, Task, TaskEvent, TaskSplit
from app.models.transaction import Transaction
from app.models.vendor_alias_dismissal import VendorAliasDismissal
from app.models.vendor_correction import VendorCorrection
from app.models.visibility_audit import VisibilityAudit

__all__ = [
    "Account",
    "Challenge",
    "ChallengeRequirementResponse",
    "ChallengeRevision",
    "ChallengerEvidence",
    "CostBasisRate",
    "DiscoveryRun",
    "FinancialConnection",
    "Invitation",
    "InvitationApproval",
    "MarketEvidence",
    "OutreachSuppression",
    "ProviderCandidate",
    "PublicListingRecord",
    "Requirement",
    "RequirementAssignment",
    "SandboxOutboxMessage",
    "SavingsCard",
    "ScopeConstraint",
    "ScopeVersion",
    "ServiceExpense",
    "Task",
    "TaskEvent",
    "TaskSplit",
    "Transaction",
    "VendorAliasDismissal",
    "VendorCorrection",
    "VisibilityAudit",
]
