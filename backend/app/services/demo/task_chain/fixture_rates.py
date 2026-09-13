"""Seeds the fixture cost basis rates of the three demo accounts, labeled fixture (roadmap open question 2).

The table was drafted before any market figures were computed, and GovCon's contract rates × the demo hours give
$1,415,200 a year against its $1,416,000 observed DevSecOps spend. Prime A's and Sub B's are internal loaded costs.
Every figure is mock demo data, not any real company's rates.
"""

from datetime import date

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models.savings import CostBasisRate
from app.services.demo.task_chain.accounts import CHAIN_ACCOUNT_IDS, GOVCON_ID, PRIME_A_ID, SUB_B_ID
from app.services.rates import RateKind, RateProvenance

# (account, kind, labor category, dollars per hour)
FIXTURE_RATES: tuple[tuple[str, RateKind, str, int], ...] = (
    (GOVCON_ID, RateKind.current_contract_rate, "DevSecOps Engineer", 190),
    (GOVCON_ID, RateKind.current_contract_rate, "Cloud Engineer", 175),
    (GOVCON_ID, RateKind.current_contract_rate, "Security Compliance Analyst", 165),
    (GOVCON_ID, RateKind.current_contract_rate, "Technical Writer", 120),
    (PRIME_A_ID, RateKind.internal_cost, "DevSecOps Engineer", 135),
    (PRIME_A_ID, RateKind.internal_cost, "Cloud Engineer", 125),
    (PRIME_A_ID, RateKind.internal_cost, "Security Compliance Analyst", 130),
    (PRIME_A_ID, RateKind.internal_cost, "Technical Writer", 95),
    (SUB_B_ID, RateKind.internal_cost, "Security Compliance Analyst", 98),
    (SUB_B_ID, RateKind.internal_cost, "Technical Writer", 70),
)

# Effective from the start of the synthetic ledger, so every demo date finds them.
EFFECTIVE_DATE = date(2026, 3, 1)


def reseed_fixture_rates(db: Session) -> int:
    """Replace the chain accounts' fixture rates with the table above and return how many were written.

    Owner-entered rates on these demo accounts are removed too: a reset returns the demo to its known inputs.
    """

    db.execute(delete(CostBasisRate).where(CostBasisRate.account_id.in_(CHAIN_ACCOUNT_IDS)))
    db.add_all(
        CostBasisRate(
            account_id=account_id,
            task_id=None,
            kind=kind.value,
            labor_category=labor_category,
            rate_minor_per_hour=dollars * 100,
            currency="USD",
            effective_date=EFFECTIVE_DATE,
            provenance=RateProvenance.fixture.value,
        )
        for account_id, kind, labor_category, dollars in FIXTURE_RATES
    )
    db.commit()
    return len(FIXTURE_RATES)
