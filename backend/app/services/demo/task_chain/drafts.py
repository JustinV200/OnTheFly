"""The demo's owner-confirmed scopes: GovCon's DevSecOps REBID and one new task for the market board.
Illustrative demo scope for a fictional buyer. PSC and NAICS codes were checked against USAspending's reference lists
on 2026-09-13 (DA01, DH01, DJ01, T013; NAICS 541512, 541990); hours are demo figures, not a real contract's staffing.
"""

from datetime import datetime, timedelta, timezone

from app.services.scope.requirements import ConstraintInput, RequirementInput
from app.services.scope.requirements.types import RequirementPriority
from app.services.tasks.scope.types import TaskScopeDraft

# Long enough that a rehearsal days before the demo still has an open deadline on the day.
DAYS_OPEN = 14


def devsecops_rebid_draft() -> TaskScopeDraft:
    """Return GovCon's DevSecOps Engineering Support scope, priced at its observed $1,416,000 a year."""

    return TaskScopeDraft(
        title="DevSecOps Engineering Support",
        category="devsecops",
        service_area="Northern Virginia",
        price_minor=141_600_000,
        currency="USD",
        billing_period="annual",
        challenge_deadline=datetime.now(timezone.utc) + timedelta(days=DAYS_OPEN),
        category_fields={
            "mission_summary": "Keep the mission applications' delivery pipeline, cloud platform and authorization to operate current.",
            "environments": ["AWS GovCloud (US)", "GitLab CI"],
            "compliance_frameworks": ["NIST SP 800-53 Rev. 5", "FedRAMP Moderate"],
            "period_of_performance_months": 12,
            "work_model": "hybrid",
        },
        requirements=[
            _requirement("Build and maintain CI/CD pipelines with integrated security scanning (SAST, DAST, SBOM)", "DevSecOps Engineer", "DA01", "541512", 3120),
            _requirement("Operate and harden the AWS GovCloud platform as infrastructure as code", "Cloud Engineer", "DH01", "541512", 2080),
            _requirement("Prepare and maintain the ATO package: SSP, control implementation statements and POA&M", "Security Compliance Analyst", "DJ01", "541512", 1040),
            _requirement("Run continuous monitoring: monthly vulnerability and configuration evidence for the ISSO", "Security Compliance Analyst", "DJ01", "541512", 1040),
            _requirement("Write and update runbooks, release notes and system documentation", "Technical Writer", "T013", "541990", 960, priority="should"),
        ],
        constraints=[
            ConstraintInput(kind="clearance", value="Secret"),
            ConstraintInput(kind="location", value="Northern Virginia, hybrid (3 days on site)"),
            ConstraintInput(kind="insurance", value="Cyber liability, $5M"),
        ],
    )


def zero_trust_new_task_draft() -> TaskScopeDraft:
    """Return the demo's new task: work with no current vendor, with a budget the poster keeps hidden."""

    return TaskScopeDraft(
        title="Zero Trust architecture assessment",
        category="devsecops",
        service_area="Northern Virginia",
        price_minor=18_000_000,
        currency="USD",
        billing_period="annual",
        challenge_deadline=datetime.now(timezone.utc) + timedelta(days=DAYS_OPEN),
        requirements=[
            _requirement("Assess identity, device and network controls against the CISA Zero Trust Maturity Model", "Security Compliance Analyst", "DJ01", "541512", 600),
            _requirement("Deliver a prioritized Zero Trust roadmap with milestones", "Security Compliance Analyst", "DJ01", "541512", 200),
        ],
        constraints=[ConstraintInput(kind="clearance", value="Secret")],
    )


def _requirement(
    text: str, labor_category: str, psc: str, naics: str, hours: int, priority: RequirementPriority = "must"
) -> RequirementInput:
    return RequirementInput(
        text=text,
        priority=priority,
        labor_category=labor_category,
        psc=psc,
        naics=naics,
        tags_status="confirmed",
        hours_estimate=hours,
        hours_status="confirmed",
        source="owner",
    )
