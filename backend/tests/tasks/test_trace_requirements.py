"""The owner's offer trace carries a requirement listing's title, the answered version's rows and the offer's answers,
so the trace page shows real coverage instead of on-site fields a DevSecOps scope never states.
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.tasks.support import GOVCON, PRIME_A, active_offer_id, headers, listing_of, requirement_keys, stage


def test_trace_of_a_requirement_offer_carries_title_rows_and_answers(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_offer")
    challenge_id = active_offer_id(db_session, chain.rebid_task_id, PRIME_A)
    keys = requirement_keys(db_session, chain.rebid_task_id)

    trace = client.get(f"/api/challenges/{challenge_id}/trace", headers=headers(GOVCON))

    assert trace.status_code == 200, trace.text
    body = trace.json()
    assert body["listing"]["title"] == listing_of(db_session, chain.rebid_task_id).title
    assert [row["key"] for row in body["scope_version"]["requirements"]] == keys
    assert {row["requirement_key"] for row in body["offer"]["requirement_responses"]} == set(keys)
    # Still owner-only: the bidder can't trace its own offer, since the trace replays the buyer's private charges.
    assert client.get(f"/api/challenges/{challenge_id}/trace", headers=headers(PRIME_A)).status_code == 404
