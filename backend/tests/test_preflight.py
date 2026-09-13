"""Checks that the pre-demo preflight turns a misconfigured or broken API into FAIL lines, not a traceback.
Requests go through httpx.MockTransport, so nothing here touches the network.
"""

from collections.abc import Callable

import httpx
import pytest

from app.cli import preflight

Handler = Callable[[httpx.Request], httpx.Response]

DEMO_STATUS = {
    "financial": {"transaction_source": "fixture", "provenance": ["fixture"], "has_production_data": False},
    "offers": {"total": 3, "genuine": 1, "captured_off_platform": 1, "demo": 2, "all_simulated": False},
}
SPA_INDEX = '<!doctype html><html><body><div id="root"></div></body></html>'


def _run(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    handler: Handler,
    *extra_args: str,
) -> tuple[int, list[str]]:
    """Run preflight against a mock transport and return its exit code and printed lines."""

    real_client = httpx.Client

    def mock_client(**kwargs: float | bool) -> httpx.Client:
        return real_client(transport=httpx.MockTransport(handler), **kwargs)

    monkeypatch.setattr(preflight.httpx, "Client", mock_client)
    exit_code = preflight.main(["--api", "https://api.example", *extra_args])
    return exit_code, capsys.readouterr().out.splitlines()


def _api(demo_status: httpx.Response) -> Handler:
    """Build a healthy API whose /api/demo/status answers with the given response."""

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/health":
            return httpx.Response(200, json={"status": "ok", "version": "0.1.0"})
        if request.url.path == "/api/demo/status":
            return demo_status
        return httpx.Response(200, json={})

    return handler


def _line(lines: list[str], item: str) -> str:
    """Return the single printed line for a checklist item."""

    matches = [line for line in lines if f"] {item}:" in line]
    assert len(matches) == 1, lines
    return matches[0]


def _assert_manual_items_printed(lines: list[str]) -> None:
    """The MANUAL half of the checklist must print whatever the automated half ran into."""

    for item in preflight.MANUAL_ITEMS:
        assert _line(lines, item).startswith("[MANUAL]")


def test_well_formed_api_passes_every_automated_line(monkeypatch, capsys) -> None:
    exit_code, lines = _run(monkeypatch, capsys, _api(httpx.Response(200, json=DEMO_STATUS)))

    assert exit_code == 0
    assert _line(lines, "Deployed API healthy") == "[PASS  ] Deployed API healthy: version 0.1.0"
    assert _line(lines, "Demo data reseeded").startswith("[PASS  ]")
    assert _line(lines, "Genuine counteroffer present").startswith("[PASS  ]")
    _assert_manual_items_printed(lines)


def test_api_pointed_at_the_frontend_fails_instead_of_crashing(monkeypatch, capsys) -> None:
    # A static host's SPA fallback answers every path, /health included, with index.html and a 200.
    def spa_fallback(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=SPA_INDEX, headers={"content-type": "text/html"})

    exit_code, lines = _run(monkeypatch, capsys, spa_fallback)

    assert exit_code == 1
    assert "not JSON" in _line(lines, "Deployed API healthy")
    assert _line(lines, "Deployed API healthy").startswith("[FAIL  ]")
    assert _line(lines, "Demo data reseeded") == "[FAIL  ] Demo data reseeded: unexpected demo status payload"
    _assert_manual_items_printed(lines)


def test_health_body_that_is_json_but_not_an_object_fails(monkeypatch, capsys) -> None:
    def list_health(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/health":
            return httpx.Response(200, json=["ok"])
        return _api(httpx.Response(200, json=DEMO_STATUS))(request)

    exit_code, lines = _run(monkeypatch, capsys, list_health)

    assert exit_code == 1
    assert _line(lines, "Deployed API healthy").startswith("[FAIL  ]")
    _assert_manual_items_printed(lines)


def test_missing_demo_status_route_fails_with_the_http_status(monkeypatch, capsys) -> None:
    not_found = httpx.Response(404, json={"error": "not_found", "detail": "Not Found"})

    exit_code, lines = _run(monkeypatch, capsys, _api(not_found))

    assert exit_code == 1
    assert _line(lines, "Demo data reseeded") == "[FAIL  ] Demo data reseeded: demo status unavailable: HTTP 404 (Not Found)"
    _assert_manual_items_printed(lines)


def test_demo_status_server_error_on_an_unmigrated_database_fails(monkeypatch, capsys) -> None:
    # /health still says ok on an unmigrated database, so this line is the only automated signal.
    server_error = httpx.Response(500, json={"error": "internal_server_error", "detail": "no such table: transactions"})

    exit_code, lines = _run(monkeypatch, capsys, _api(server_error))

    assert exit_code == 1
    assert _line(lines, "Deployed API healthy").startswith("[PASS  ]")
    assert _line(lines, "Demo data reseeded") == (
        "[FAIL  ] Demo data reseeded: demo status unavailable: HTTP 500 (no such table: transactions)"
    )
    _assert_manual_items_printed(lines)


@pytest.mark.parametrize(
    "payload",
    [
        {"financial": {}},
        ["financial"],
        {"financial": {"provenance": ["fixture"]}, "offers": {"total": 1, "genuine": "one", "captured_off_platform": 0}},
    ],
)
def test_demo_status_with_an_unexpected_shape_fails(monkeypatch, capsys, payload: object) -> None:
    exit_code, lines = _run(monkeypatch, capsys, _api(httpx.Response(200, json=payload)))

    assert exit_code == 1
    assert _line(lines, "Demo data reseeded") == "[FAIL  ] Demo data reseeded: unexpected demo status payload"
    _assert_manual_items_printed(lines)


def test_an_unexpected_error_inside_one_check_still_prints_the_rest(monkeypatch, capsys) -> None:
    def exploding_health(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/health":
            raise RuntimeError("transport blew up")
        return _api(httpx.Response(200, json=DEMO_STATUS))(request)

    exit_code, lines = _run(monkeypatch, capsys, exploding_health)

    assert exit_code == 1
    assert _line(lines, "Deployed API healthy") == (
        "[FAIL  ] Deployed API healthy: check crashed: RuntimeError: transport blew up"
    )
    assert _line(lines, "Demo data reseeded").startswith("[PASS  ]")
    _assert_manual_items_printed(lines)
