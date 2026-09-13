"""Verifies the health endpoint returns the expected readiness payload."""

from app.db.seed import SEEDED_ACCOUNTS


def test_health_returns_ok(client) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    # Every seeded account: the cleaning demo's six plus GovCon's two task-chain bidders (roadmap 12).
    assert response.json()["account_count"] == len(SEEDED_ACCOUNTS) == 8
