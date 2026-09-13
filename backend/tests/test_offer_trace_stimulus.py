"""Checks the brain stimulus on the owner-only trace: the Compound Eye's amounts, and only when it ran."""

import re

from sqlalchemy import select

from app.models.transaction import Transaction
from app.services.challenges.submit import submit_challenge
from app.services.expenses.signals import CHARGE_SHAPE, compound_eye_amount_receptors
from app.services.flybrain import SensoryInput, StimulusInput
from app.services.flybrain.brain_stimulus import GAP_MS, PULSE_MS, TAIL_MS, build_pulse
from tests.test_challenges import _create_public_listing
from tests.test_offer_trace import _publish_stripe_listing, _stripe_row, _trace_as_owner

SLOT_MS = PULSE_MS + GAP_MS
CAPTION_RE = re.compile(r"^Charge [1-8] of [1-8]$")


def _visual_pulse(row: Transaction, caption: str, start_ms: int) -> dict:
    vector = compound_eye_amount_receptors(row, CHARGE_SHAPE.input_dim)
    pulse = build_pulse(StimulusInput(SensoryInput.visual, caption, vector), CHARGE_SHAPE.input_dim, start_ms)
    assert pulse is not None
    return pulse.model_dump(mode="json")


def _posted_debits(db_session, vendor_key: str) -> list[Transaction]:
    rows = db_session.scalars(
        select(Transaction).where(
            Transaction.normalized_vendor == vendor_key,
            Transaction.status == "posted",
            Transaction.direction == "debit",
        )
    ).all()
    return sorted(rows, key=lambda row: (row.posted_at, row.id))


def test_trace_replays_the_charges_the_compound_eye_read(client, db_session) -> None:
    debits = [_stripe_row(f"txn_debit_{index}", 30 * index) for index in range(6)]
    refund = _stripe_row("txn_refund", 160, direction="credit")
    voided = _stripe_row("txn_void", 175, status="void")
    listing = _publish_stripe_listing(db_session, [*debits, refund, voided])

    trace = _trace_as_owner(client, db_session, listing)
    stimulus = trace["brain_stimulus"]
    rows = _posted_debits(db_session, "Sparkle Clean [USD]")

    # Sync counts only the six posted debits, so the refund and the void never reach the detector or the replay.
    assert len(rows) == 6
    assert stimulus["result_label"] == "Baseline trace"
    assert stimulus["circuits"] == ["compound_eye"]
    assert stimulus["receptor_count"] == CHARGE_SHAPE.input_dim
    assert stimulus["pulses"] == [
        _visual_pulse(row, f"Charge {position} of 6", (position - 1) * SLOT_MS)
        for position, row in enumerate(rows, start=1)
    ]
    assert stimulus["duration_ms"] == 5 * SLOT_MS + PULSE_MS + TAIL_MS
    assert all(CAPTION_RE.match(pulse["caption"]) for pulse in stimulus["pulses"])


def test_fixture_trace_replays_only_the_most_recent_eight_charges(client, db_session) -> None:
    listing = _create_public_listing(db_session)

    trace = _trace_as_owner(client, db_session, listing)
    pulses = trace["brain_stimulus"]["pulses"]
    rows = sorted(
        db_session.scalars(select(Transaction).where(Transaction.normalized_vendor == "Sparkle Clean")).all(),
        key=lambda row: (row.posted_at, row.id),
    )

    assert len(rows) == 12
    assert pulses == [
        _visual_pulse(row, f"Charge {position} of 8", (position - 1) * SLOT_MS)
        for position, row in enumerate(rows[-8:], start=1)
    ]


def test_trace_has_no_stimulus_when_the_compound_eye_did_not_run(client, db_session) -> None:
    listing = _publish_stripe_listing(db_session, [_stripe_row(f"txn_debit_{index}", 30 * index) for index in range(2)])

    trace = _trace_as_owner(client, db_session, listing)

    # Two charges have no recurring schedule, so the detector refused the series before reading an amount.
    assert trace["fly_brain"][0]["role"].startswith("Not run")
    assert trace["brain_stimulus"] is None


def test_trace_stimulus_is_never_served_to_anyone_but_the_owner(client, db_session) -> None:
    listing = _create_public_listing(db_session)
    challenge = submit_challenge(listing.id, "acc_challenger_1", {"price_minor": 187500, "billing_frequency": "monthly"}, db_session)

    as_challenger = client.get(f"/api/challenges/{challenge.id}/trace", headers={"X-Account-ID": "acc_challenger_1"})

    assert as_challenger.status_code == 404
    assert "brain_stimulus" not in as_challenger.text
