"""A yearly offer against a yearly price saves exactly their difference: savings are taken per year from each side's own
cadence, not from monthly figures rounded and multiplied back up ($1,298,000 a year is $108,166.67 a month).
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.tasks.support import GOVCON, headers, listing_of, stage

OBSERVED_ANNUAL = 141_600_000
PRIME_A_ANNUAL = 129_800_000


def test_inbox_savings_on_a_yearly_offer_are_the_exact_yearly_difference(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_offer")
    listing = listing_of(db_session, chain.rebid_task_id)

    inbox = client.get(f"/api/listings/{listing.id}/inbox", headers=headers(GOVCON))

    assert inbox.status_code == 200, inbox.text
    savings = inbox.json()["challenges"][0]["savings"]
    assert savings["annual_recurring_savings_minor"] == OBSERVED_ANNUAL - PRIME_A_ANNUAL
    # Ranking still compares offers per month, so that figure keeps its own rounding.
    assert inbox.json()["challenges"][0]["normalized_price_minor"] == 10_816_667
