"""Checks the brain stimulus on spend signals: the novelty filter's own codes, the Compound Eye's amounts only when it ran."""

from datetime import datetime, timezone
import re

from sqlalchemy import select

from app.models.transaction import Transaction
from app.services.expenses.signals import (
    CHARGE_SHAPE,
    NotAssessedReason,
    charge_amount_receptors,
    charge_brain_stimulus,
    charge_description_receptors,
    compound_eye_amount_receptors,
    did_compound_eye_run,
    not_assessed_price_levels,
)
from app.services.expenses.sync import sync_service_expenses
from app.services.flybrain import (
    SensoryInput,
    StimulusInput,
    encode_log_magnitude,
    encode_trigrams,
    merge_vectors,
    text_words,
)
from app.services.flybrain.brain_stimulus import GAP_MS, PULSE_MS, TAIL_MS, build_pulse
from app.services.transactions.import_run import run_import
from tests.test_spend_signals import OWNER_HEADERS, PROVIDER_ACCOUNT_ID, _expense
from tests.test_spend_signals_stripe_status import OWNER_HEADERS as STRIPE_OWNER_HEADERS
from tests.test_spend_signals_stripe_status import OWNER_ID as STRIPE_OWNER_ID
from tests.test_spend_signals_stripe_status import _stored_expense, _stripe_row

SLOT_MS = PULSE_MS + GAP_MS
CAPTION_RE = re.compile(r"^Charge [1-8] of [1-8]$")


def _report(client, db_session, vendor: str) -> dict:
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)
    response = client.get(f"/api/spend-signals/{_expense(db_session, vendor).id}", headers=OWNER_HEADERS)
    assert response.status_code == 200
    return response.json()


def _charges(db_session, vendor: str) -> list[Transaction]:
    rows = db_session.scalars(select(Transaction).where(Transaction.normalized_vendor == vendor)).all()
    return sorted(rows, key=lambda row: (row.posted_at, row.id))


def _pulse(sense: SensoryInput, caption: str, vector: dict[int, float], start_ms: int) -> dict:
    pulse = build_pulse(StimulusInput(sense, caption, vector), CHARGE_SHAPE.input_dim, start_ms)
    assert pulse is not None
    return pulse.model_dump(mode="json")


def _expected_slot(row: Transaction, caption: str, start_ms: int, has_visual: bool) -> list[dict]:
    olfactory = merge_vectors(
        charge_amount_receptors(row, CHARGE_SHAPE.input_dim),
        charge_description_receptors(row, CHARGE_SHAPE.input_dim),
    )
    pulses = [_pulse(SensoryInput.olfactory, caption, olfactory, start_ms)]
    if has_visual:
        pulses.append(_pulse(SensoryInput.visual, caption, compound_eye_amount_receptors(row, CHARGE_SHAPE.input_dim), start_ms))
    return pulses


def test_both_circuits_replay_every_charge_when_both_ran(client, db_session) -> None:
    report = _report(client, db_session, "Orkin Pest Control")
    stimulus = report["brain_stimulus"]
    rows = _charges(db_session, "Orkin Pest Control")

    assert len(rows) == 7
    assert stimulus["result_label"] == "Spend signals"
    assert stimulus["circuits"] == ["compound_eye", "mushroom_body_novelty"]
    assert stimulus["receptor_count"] == CHARGE_SHAPE.input_dim
    expected = [
        pulse
        for position, row in enumerate(rows, start=1)
        for pulse in _expected_slot(row, f"Charge {position} of 7", (position - 1) * SLOT_MS, has_visual=True)
    ]
    assert stimulus["pulses"] == expected
    assert stimulus["duration_ms"] == 6 * SLOT_MS + PULSE_MS + TAIL_MS


def test_only_the_most_recent_eight_charges_are_replayed(client, db_session) -> None:
    report = _report(client, db_session, "Sparkle Clean")
    pulses = report["brain_stimulus"]["pulses"]
    rows = _charges(db_session, "Sparkle Clean")

    assert len(rows) == 12
    assert [pulse["caption"] for pulse in pulses[::2]] == [f"Charge {position} of 8" for position in range(1, 9)]
    # Slot 1 is the fifth-oldest charge: the four oldest were left out.
    assert pulses[:2] == _expected_slot(rows[4], "Charge 1 of 8", 0, has_visual=True)
    assert pulses[-2:] == _expected_slot(rows[-1], "Charge 8 of 8", 7 * SLOT_MS, has_visual=True)


def test_compound_eye_that_found_no_stable_price_still_ran(client, db_session) -> None:
    report = _report(client, db_session, "Office Depot")

    assert report["price_levels"]["not_assessed_reason"] == "amounts_too_variable"
    assert report["brain_stimulus"]["circuits"] == ["compound_eye", "mushroom_body_novelty"]
    assert {pulse["sense"] for pulse in report["brain_stimulus"]["pulses"]} == {"olfactory", "visual"}


def test_compound_eye_that_did_not_run_adds_no_visual_pulse(client, db_session) -> None:
    report = _report(client, db_session, "Sparkle Cleaning Services LLC")
    stimulus = report["brain_stimulus"]
    rows = _charges(db_session, "Sparkle Cleaning Services LLC")

    # One charge has no recurring schedule, so the detector never read it; the novelty filter still scored it.
    assert report["price_levels"]["not_assessed_reason"] == "cadence_not_recurring"
    assert stimulus["circuits"] == ["mushroom_body_novelty"]
    assert stimulus["pulses"] == _expected_slot(rows[0], "Charge 1 of 1", 0, has_visual=False)


def test_no_posted_charges_means_no_stimulus(client, db_session) -> None:
    rows = [_stripe_row(month, 150000, month, "posted") for month in (1, 2, 3, 4)]
    db_session.add_all(rows)
    db_session.commit()
    sync_service_expenses(STRIPE_OWNER_ID, db_session)
    # Stripe later reports every charge void, so neither circuit has a charge to read.
    for row in rows:
        row.status = "void"
    db_session.commit()
    sync_service_expenses(STRIPE_OWNER_ID, db_session)

    report = client.get(f"/api/spend-signals/{_stored_expense(db_session).id}", headers=STRIPE_OWNER_HEADERS).json()

    assert report["price_levels"]["not_assessed_reason"] == "no_posted_charges"
    assert report["brain_stimulus"] is None


def test_captions_carry_no_amount_description_or_vendor(client, db_session) -> None:
    report = _report(client, db_session, "Orkin Pest Control")
    captions = [pulse["caption"] for pulse in report["brain_stimulus"]["pulses"]]

    assert all(CAPTION_RE.match(caption) for caption in captions)
    joined = " ".join(captions).casefold()
    for row in _charges(db_session, "Orkin Pest Control"):
        for word in text_words(f"{row.raw_description} {row.memo} {row.counterparty}"):
            assert word not in joined
        assert str(row.amount_minor) not in joined


def test_a_refund_gets_the_novelty_code_but_no_compound_eye_pulse() -> None:
    charge = _row("txn_charge", 50000, "debit", day=5)
    refund = _row("txn_refund", 50000, "credit", day=20)

    stimulus = charge_brain_stimulus("Spend signals", [refund, charge], did_novelty_run=True, did_compound_eye_run=True)

    assert stimulus is not None
    by_caption = [(pulse.caption, pulse.sense) for pulse in stimulus.pulses]
    # The detector never reads a credit, so only the debit's slot carries a visual pulse.
    assert by_caption == [
        ("Charge 1 of 2", SensoryInput.olfactory),
        ("Charge 1 of 2", SensoryInput.visual),
        ("Charge 2 of 2", SensoryInput.olfactory),
    ]


def test_neither_circuit_running_means_no_stimulus() -> None:
    assert charge_brain_stimulus("Spend signals", [_row("txn", 50000, "debit", 5)], False, False) is None


def test_compound_eye_ran_only_when_the_detector_read_the_series() -> None:
    ran = {reason: did_compound_eye_run(not_assessed_price_levels(reason)) for reason in NotAssessedReason}

    assert ran == {
        NotAssessedReason.cadence_not_recurring: False,
        NotAssessedReason.too_few_charges: False,
        NotAssessedReason.mixed_currency: False,
        NotAssessedReason.amounts_too_variable: True,
        NotAssessedReason.no_posted_charges: False,
    }


def test_moved_receptor_helpers_encode_exactly_as_before() -> None:
    row = _row("txn", 18500, "debit", 12, description="ORKIN PEST CONTROL 4158881234", memo="Monthly pest control")

    # The inline encodings charge_novelty used before the helpers moved, spelled out.
    assert charge_amount_receptors(row, 1024) == encode_log_magnitude(
        18500.0, channel="amount:debit:USD", receptor_count=1024, step_ratio=1.02, spread=2
    )
    assert charge_description_receptors(row, 1024) == encode_trigrams(
        ["orkin", "pest", "control", "monthly", "pest", "control"], channel="description", receptor_count=1024
    )
    assert compound_eye_amount_receptors(row, 1024) == encode_log_magnitude(
        18500.0, channel="eye:amount:debit:USD", receptor_count=1024, step_ratio=1.02, spread=2
    )


def _row(
    transaction_id: str,
    amount_minor: int,
    direction: str,
    day: int,
    description: str = "SPARKLE CLEAN",
    memo: str | None = None,
) -> Transaction:
    return Transaction(
        id=transaction_id,
        provider="fixture",
        raw_description=description,
        memo=memo,
        amount_minor=amount_minor,
        currency="USD",
        direction=direction,
        posted_at=datetime(2026, 3, day, tzinfo=timezone.utc),
        status="posted",
    )
