"""Runs the automatable half of the pre-demo checklist against deployed URLs (roadmap 09, step 10).

    python -m app.cli.preflight --api https://api.example --frontend https://app.example

It only reads: no reset, no writes. Items a script can't judge (projector, cell data, recording) print as MANUAL.
"""

from __future__ import annotations

import argparse
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


@dataclass(frozen=True)
class CheckLine:
    """One checklist line and what was observed."""

    outcome: Outcome
    item: str
    detail: str


def main(argv: list[str] | None = None) -> int:
    """Print every checklist line; exit 1 if any automated check failed."""

    args = _parse_args(argv)
    api = args.api.rstrip("/")
    lines: list[CheckLine] = []
    with httpx.Client(timeout=args.timeout, follow_redirects=True) as client:
        lines.append(_check_health(client, api))
        lines.extend(_check_public_reads(client, api, args.profile_handle))
        lines.extend(_check_demo_seams(client, api))
        if args.frontend:
            frontend = args.frontend.rstrip("/")
            lines.append(_check_cors(client, api, frontend))
            lines.extend(_check_frontend(client, frontend, args.profile_handle))
        else:
            lines.append(CheckLine("WARN", "Deployed frontend reaching the API", "skipped: pass --frontend"))
    lines.extend(CheckLine("MANUAL", item, "check by hand") for item in MANUAL_ITEMS)

    for line in lines:
        print(f"[{line.outcome:<6}] {line.item}: {line.detail}")
    return 1 if any(line.outcome == "FAIL" for line in lines) else 0


def _check_health(client: httpx.Client, api: str) -> CheckLine:
    try:
        response = client.get(f"{api}/health")
    except httpx.HTTPError as error:
        return CheckLine("FAIL", "Deployed API healthy", f"unreachable: {error}")
    if response.status_code != 200 or response.json().get("status") != "ok":
        return CheckLine("FAIL", "Deployed API healthy", f"HTTP {response.status_code}")
    return CheckLine("PASS", "Deployed API healthy", f"version {response.json().get('version')}")


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
        status = client.get(f"{api}/api/demo/status").json()
    except (httpx.HTTPError, ValueError) as error:
        return [CheckLine("FAIL", "Demo data reseeded", f"demo status unavailable: {error}")]

    provenance = status["financial"]["provenance"]
    offers = status["offers"]
    seeded = CheckLine(
        "PASS" if provenance else "FAIL",
        "Demo data reseeded",
        f"financial provenance {provenance or 'none: nothing imported'}; {offers['total']} active offers",
    )
    genuine = CheckLine(
        "PASS" if offers["genuine"] > 0 else "WARN",
        "Genuine counteroffer present",
        f"{offers['genuine']} genuine ({offers['captured_off_platform']} captured off-platform)"
        if offers["genuine"]
        else "none: every offer on screen will carry the simulated label",
    )
    return [seeded, genuine]


def _check_cors(client: httpx.Client, api: str, frontend: str) -> CheckLine:
    item = "Deployed frontend allowed to call the API (CORS)"
    try:
        response = client.options(
            f"{api}/api/marketplace",
            headers={"Origin": frontend, "Access-Control-Request-Method": "GET"},
        )
    except httpx.HTTPError as error:
        return CheckLine("FAIL", item, f"unreachable: {error}")
    allowed = response.headers.get("access-control-allow-origin")
    if allowed in (frontend, "*"):
        return CheckLine("PASS", item, f"allow-origin {allowed}")
    return CheckLine("FAIL", item, f"allow-origin is {allowed!r}; add {frontend} to CORS_ALLOW_ORIGINS")


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
