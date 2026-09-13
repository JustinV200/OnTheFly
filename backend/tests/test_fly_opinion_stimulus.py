"""Checks the fruit fly's opinion stimulus: two olfactory trials, price as a thermometer, gaps as extra receptors."""

from app.core.money import Money
from app.services.challenges.submit import submit_challenge
from app.services.comparison.fly_opinion_stimulus import (
    MAX_PRICE_RECEPTORS,
    NOW_CAPTION,
    OFFER_CAPTION,
    OPINION_INPUT_DIM,
    PRICE_RECEPTORS_AT_BASELINE,
    RECEPTORS_PER_MISSING_ITEM,
    RECEPTORS_PER_UNSTATED_ITEM,
    RESULT_LABEL,
    fly_opinion_stimulus,
)
from app.services.comparison.rank import RankedChallenge
from app.services.flybrain.brain_stimulus import GAP_MS, PULSE_MS, TAIL_MS
from tests.test_challenges import _create_public_listing

SLOT_MS = PULSE_MS + GAP_MS


def _row(
    offer_monthly: int | None = 180_000,
    baseline_monthly: int | None = 240_000,
    missing: tuple[str, ...] = (),
    unstated: tuple[str, ...] = (),
    unranked_reason: str | None = None,
    is_incumbent: bool = False,
) -> RankedChallenge:
    return RankedChallenge(
        challenge_id=None if is_incumbent else "chal_1",
        challenger_account_id=None if is_incumbent else "acc_challenger_1",
        is_incumbent=is_incumbent,
        normalized_price=Money(offer_monthly, "USD") if offer_monthly is not None else None,
        baseline_monthly=Money(baseline_monthly, "USD") if baseline_monthly is not None else None,
        scope_completeness=1.0,
        missing_items=list(missing),
        added_items=[],
        unstated_items=list(unstated),
        savings=None,
        unranked_reason=unranked_reason,
        answered_scope_version_number=1,
        is_current_scope_version=True,
        provenance="challenger_submitted",
        bidding_mode_at_submission="sealed",
    )


def _pulses(row: RankedChallenge) -> tuple[dict, dict]:
    stimulus = fly_opinion_stimulus(row)
    assert stimulus is not None
    now, offer = (pulse.model_dump(mode="json") for pulse in stimulus.pulses)
    return now, offer


def test_now_then_the_offer_as_two_olfactory_trials() -> None:
    stimulus = fly_opinion_stimulus(_row())

    assert stimulus is not None
    assert stimulus.result_label == RESULT_LABEL
    assert [circuit.value for circuit in stimulus.circuits] == ["whole_brain_simulation"]
    assert stimulus.receptor_count == OPINION_INPUT_DIM
    assert [(pulse.caption, pulse.sense.value, pulse.start_ms) for pulse in stimulus.pulses] == [
        (NOW_CAPTION, "olfactory", 0),
        (OFFER_CAPTION, "olfactory", SLOT_MS),
    ]
    assert stimulus.duration_ms == SLOT_MS + PULSE_MS + TAIL_MS


def test_a_cheaper_offer_is_a_fainter_smell_on_the_same_receptors() -> None:
    now, offer = _pulses(_row(offer_monthly=180_000, baseline_monthly=240_000))

    # 75% of the baseline drives 6 of the 8 price channels, every one shared with "now" and at full strength.
    assert len(now["receptors"]) == PRICE_RECEPTORS_AT_BASELINE
    assert now["strengths"] == [1.0] * PRICE_RECEPTORS_AT_BASELINE
    assert len(offer["receptors"]) == 6
    assert set(offer["receptors"]) < set(now["receptors"])
    assert offer["strengths"] == [1.0] * 6


def test_a_slightly_cheaper_offer_drives_its_top_channel_partially() -> None:
    now, offer = _pulses(_row(offer_monthly=232_800, baseline_monthly=240_000))

    # 97% of the baseline is 7.76 channels: seven full and the eighth at 0.76, so it never rounds to "now".
    assert set(offer["receptors"]) == set(now["receptors"])
    assert sorted(offer["strengths"]) == [0.76] + [1.0] * 7


def test_a_dearer_offer_drives_more_channels_up_to_the_cap() -> None:
    _, dearer = _pulses(_row(offer_monthly=360_000, baseline_monthly=240_000))
    _, far_dearer = _pulses(_row(offer_monthly=1_000_000, baseline_monthly=240_000))

    assert len(dearer["receptors"]) == 12
    assert len(far_dearer["receptors"]) == MAX_PRICE_RECEPTORS


def test_scope_gaps_add_receptors_to_the_offer_only() -> None:
    complete_now, complete_offer = _pulses(_row(offer_monthly=240_000))
    gapped_now, gapped_offer = _pulses(_row(offer_monthly=240_000, missing=("requirement:req_a",), unstated=("supplies",)))

    assert gapped_now == complete_now
    assert len(gapped_offer["receptors"]) == len(complete_offer["receptors"]) + RECEPTORS_PER_MISSING_ITEM + RECEPTORS_PER_UNSTATED_ITEM
    assert set(complete_offer["receptors"]) < set(gapped_offer["receptors"])


def test_no_opinion_without_something_to_compare_against() -> None:
    assert fly_opinion_stimulus(_row(baseline_monthly=None)) is None
    assert fly_opinion_stimulus(_row(unranked_reason="Offer is in EUR; baseline is in USD")) is None
    assert fly_opinion_stimulus(_row(is_incumbent=True, offer_monthly=240_000)) is None


def test_inbox_rows_carry_the_stimulus_for_the_owner(client, db_session) -> None:
    listing = _create_public_listing(db_session)
    submit_challenge(listing.id, "acc_challenger_1", {"price_minor": 187500, "billing_frequency": "monthly"}, db_session)

    inbox = client.get(f"/api/listings/{listing.id}/inbox", headers={"X-Account-ID": "acc_owner_1"}).json()

    row = inbox["challenges"][0]
    stimulus = row["fly_opinion_stimulus"]
    assert [pulse["caption"] for pulse in stimulus["pulses"]] == [NOW_CAPTION, OFFER_CAPTION]
    # $1,875 against $2,400 a month is 78%: 6.25 channels, so six full ones and a seventh at a quarter, plus one full
    # receptor for each scope item the bare offer left unstated (it named no inclusions at all).
    gap_receptors = RECEPTORS_PER_MISSING_ITEM * len(row["missing_items"]) + RECEPTORS_PER_UNSTATED_ITEM * len(row["unstated_items"])
    assert len(stimulus["pulses"][0]["receptors"]) == PRICE_RECEPTORS_AT_BASELINE
    assert sorted(stimulus["pulses"][1]["strengths"]) == [0.25] + [1.0] * (6 + gap_receptors)
