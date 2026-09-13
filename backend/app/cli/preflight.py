"""Runs the automatable half of the pre-demo checklist against deployed URLs (roadmap 09, "Pre-demo checklist").

    python -m app.cli.preflight --api https://api.example --frontend https://app.example

It only reads: no reset, no writes. Items a script can't judge (projector, cell data, recording) print as MANUAL.
"""

from __future__ import annotations

import argparse
from collections.abc import Callable
from dataclasses import dataclass
import sys
from typing import Literal

import httpx

Outcome = Literal["PASS", "WARN", "FAIL", "MANUAL"]

MANUAL_ITEMS = [
    "Public profile opened in a logged-out window, on a phone, on cell data",
    "Account switcher legible on the projector from the back of the room",
    "Every screen loads from a cold session (private window, no stored account)",
    "A backup recording exists in case the network dies entirely",
    "Genuine counteroffer shown with its real amount, terms, timestamp, and channel",
]

HEALTH_ITEM = "Deployed API healthy"
DEMO_ITEM = "Demo data reseeded"
CORS_ITEM = "Deployed frontend allowed to call the API (CORS)"

# Error envelope details can carry a multi-line SQL error; keep each checklist entry to one readable line.
MAX_DETAIL_CHARS = 200


@dataclass(frozen=True)
class CheckLine:
    """One checklist line and what was observed."""

    outcome: Outcome
    item: str
    detail: str


def main(argv: list[str] | None = None) -> int:
    """Print every checklist line; exit 1 if any automated check failed.

    Each check runs guarded: an unexpected error prints as a FAIL line for that check, and the
    remaining checks and the MANUAL items still print.
    """

    args = _parse_args(argv)
    api = args.api.rstrip("/")
    handle = args.profile_handle
    lines: list[CheckLine] = []
    with httpx.Client(timeout=args.timeout, follow_redirects=True) as client:
        lines.extend(_guarded(HEALTH_ITEM, lambda: [_check_health(client, api)]))
        lines.extend(_guarded("Public reads without an account", lambda: _check_public_reads(client, api, handle)))
        lines.extend(_guarded(DEMO_ITEM, lambda: _check_demo_seams(client, api)))
        if args.frontend:
            frontend = args.frontend.rstrip("/")
            lines.extend(_guarded(CORS_ITEM, lambda: [_check_cors(client, api, frontend)]))
            lines.extend(_guarded("Frontend serves the app", lambda: _check_frontend(client, frontend, handle)))
        else:
            lines.append(CheckLine("WARN", "Deployed frontend reaching the API", "skipped: pass --frontend"))
    lines.extend(CheckLine("MANUAL", item, "check by hand") for item in MANUAL_ITEMS)

    for line in lines:
        print(f"[{line.outcome:<6}] {line.item}: {line.detail}")
    return 1 if any(line.outcome == "FAIL" for line in lines) else 0


def _guarded(item: str, check: Callable[[], list[CheckLine]]) -> list[CheckLine]:
    # Deliberately broad: this is the last line of defence for a tool whose whole job is to turn a broken
    # deployment into readable FAIL lines. Lines print only after every check runs, so one escaping error
    # would otherwise hide the entire checklist, MANUAL items included. The error still surfaces, named.
    try:
        return check()
    except Exception as error:
        return [CheckLine("FAIL", item, f"check crashed: {type(error).__name__}: {error}")]


def _check_health(client: httpx.Client, api: str) -> CheckLine:
    try:
        response = client.get(f"{api}/health")
    except httpx.HTTPError as error:
        return CheckLine("FAIL", HEALTH_ITEM, f"unreachable: {error}")
    if response.status_code != 200:
        return CheckLine("FAIL", HEALTH_ITEM, f"HTTP {response.status_code}")

    # A static host's SPA fallback answers every path with index.html and a 200, so a 200 alone
    # doesn't prove --api points at the API.
    try:
        health = response.json()
    except ValueError:
        return CheckLine("FAIL", HEALTH_ITEM, "HTTP 200 but /health is not JSON; is --api the frontend origin?")
    if not isinstance(health, dict):
        return CheckLine("FAIL", HEALTH_ITEM, "HTTP 200 but /health is not the API health payload")
    if health.get("status") != "ok":
        return CheckLine("FAIL", HEALTH_ITEM, f"HTTP 200 but status is {health.get('status')!r}")
    return CheckLine("PASS", HEALTH_ITEM, f"version {health.get('version')}")


def _check_public_reads(client: httpx.Client, api: str, handle: str) -> list[CheckLine]:
    # Deliberately no X-Account-ID header: this is the stranger's view the privacy proof relies on.
    lines = []
    for item, path in [
        ("Public profile readable without an account", f"/api/profiles/{handle}"),
        ("Marketplace feed readable without an account", "/api/marketplace"),
    ]:
        try:
            response = client.get(f"{api}{path}")
            outcome: Outcome = "PASS" if response.status_code == 200 else "FAIL"
            lines.append(CheckLine(outcome, item, f"HTTP {response.status_code}"))
        except httpx.HTTPError as error:
            lines.append(CheckLine("FAIL", item, f"unreachable: {error}"))
    return lines


def _check_demo_seams(client: httpx.Client, api: str) -> list[CheckLine]:
    try:
        response = client.get(f"{api}/api/demo/status")
    except httpx.HTTPError as error:
        return [CheckLine("FAIL", DEMO_ITEM, f"demo status unavailable: {error}")]
    # This API's 404 and 500 bodies are JSON error envelopes, so a body that parses is not yet a status
    # payload. /health still says ok on an unmigrated database, which leaves this line to catch it.
    if response.status_code != 200:
        detail = _error_detail(response)
        return [CheckLine("FAIL", DEMO_ITEM, f"demo status unavailable: HTTP {response.status_code}{detail}")]

    # Every read and comparison stays inside the try: a missing key, a list or string where an object
    # belongs, or a non-numeric count each mean this isn't the demo status payload.
    try:
        status = response.json()
        provenance = status["financial"]["provenance"]
        total = status["offers"]["total"]
        genuine = status["offers"]["genuine"]
        captured = status["offers"]["captured_off_platform"]
        has_genuine = genuine > 0
    except (ValueError, KeyError, TypeError):
        return [CheckLine("FAIL", DEMO_ITEM, "unexpected demo status payload")]

    seeded = CheckLine(
        "PASS" if provenance else "FAIL",
        DEMO_ITEM,
        f"financial provenance {provenance or 'none: nothing imported'}; {total} active offers",
    )
    genuine_line = CheckLine(
        "PASS" if has_genuine else "WARN",
        "Genuine counteroffer present",
        f"{genuine} genuine ({captured} captured off-platform)"
        if has_genuine
        else "none: every offer on screen will carry the simulated label",
    )
    return [seeded, genuine_line]


def _error_detail(response: httpx.Response) -> str:
    # Returns " (detail)" from the API's error envelope, or "" when the body carries no string detail.
    try:
        body = response.json()
    except ValueError:
        return ""
    detail = body.get("detail") if isinstance(body, dict) else None
    if not isinstance(detail, str) or not detail.strip():
        return ""
    return f" ({' '.join(detail.split())[:MAX_DETAIL_CHARS]})"


def _check_cors(client: httpx.Client, api: str, frontend: str) -> CheckLine:
    try:
        response = client.options(
            f"{api}/api/marketplace",
            headers={"Origin": frontend, "Access-Control-Request-Method": "GET"},
        )
    except httpx.HTTPError as error:
        return CheckLine("FAIL", CORS_ITEM, f"unreachable: {error}")
    allowed = response.headers.get("access-control-allow-origin")
    if allowed in (frontend, "*"):
        return CheckLine("PASS", CORS_ITEM, f"allow-origin {allowed}")
    return CheckLine("FAIL", CORS_ITEM, f"allow-origin is {allowed!r}; add {frontend} to CORS_ALLOW_ORIGINS")


def _check_frontend(client: httpx.Client, frontend: str, handle: str) -> list[CheckLine]:
    # The deep link matters: refreshing the public profile window is the last beat of the privacy
    # proof, and many static hosts 404 on refresh without an SPA fallback rule.
    lines = []
    for item, path in [("Frontend serves the app", "/"), ("Frontend serves profile deep link on refresh", f"/p/{handle}")]:
        try:
            response = client.get(f"{frontend}{path}")
            served = response.status_code == 200 and 'id="root"' in response.text
            lines.append(CheckLine("PASS" if served else "FAIL", item, f"HTTP {response.status_code}"))
        except httpx.HTTPError as error:
            lines.append(CheckLine("FAIL", item, f"unreachable: {error}"))
    return lines


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Read-only pre-demo checklist against deployed URLs.")
    parser.add_argument("--api", required=True, help="Deployed API base URL.")
    parser.add_argument("--frontend", help="Deployed frontend origin, e.g. https://app.example.")
    parser.add_argument("--profile-handle", default="apex-facilities", help="Handle of the demo owner's profile.")
    parser.add_argument("--timeout", type=float, default=10.0, help="Per-request timeout in seconds.")
    return parser.parse_args(argv)


if __name__ == "__main__":
    sys.exit(main())
