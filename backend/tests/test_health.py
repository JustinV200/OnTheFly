"""Verifies the health endpoint returns the expected readiness payload."""


def test_health_returns_ok(client) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["account_count"] == 6
