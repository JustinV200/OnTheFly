"""Checks the brain-stimulus pulse rules: normalization, the receptor cap, rounding, and slot timing."""

import pytest

from app.services.flybrain import FlyBrainComponent, SensoryInput, StimulusInput
from app.services.flybrain.brain_stimulus import (
    GAP_MS,
    MAX_RECEPTORS_PER_PULSE,
    MAX_SLOTS,
    PULSE_MS,
    TAIL_MS,
    build_brain_stimulus,
    build_pulse,
)

RECEPTORS = 1024
CIRCUITS = [FlyBrainComponent.mushroom_body_flyhash]


def _input(vector: dict[int, float], caption: str = "Input 1", sense: SensoryInput = SensoryInput.olfactory) -> StimulusInput:
    return StimulusInput(sense=sense, caption=caption, vector=vector)


def test_strengths_are_relative_to_the_peak_and_receptors_ascend() -> None:
    pulse = build_pulse(_input({900: 1.5, 3: 3.0, 40: 0.75}), RECEPTORS, start_ms=0)

    assert pulse is not None
    assert pulse.receptors == [3, 40, 900]
    assert pulse.strengths == [1.0, 0.25, 0.5]
    assert max(pulse.strengths) == 1.0
    assert pulse.duration_ms == PULSE_MS
    assert pulse.caption == "Input 1"


def test_zero_and_negative_activations_are_dropped() -> None:
    pulse = build_pulse(_input({1: 2.0, 2: 0.0, 3: -1.0}), RECEPTORS, start_ms=0)

    assert pulse is not None
    assert pulse.receptors == [1]
    assert pulse.strengths == [1.0]


def test_empty_or_silent_vector_yields_no_pulse() -> None:
    assert build_pulse(_input({}), RECEPTORS, start_ms=0) is None
    assert build_pulse(_input({5: 0.0}), RECEPTORS, start_ms=0) is None


def test_weak_receptor_never_rounds_to_silence() -> None:
    pulse = build_pulse(_input({0: 1000.0, 1: 1.0, 2: 6.0}), RECEPTORS, start_ms=0)

    assert pulse is not None
    # 1/1000 rounds to 0.00 and is raised to the floor; 6/1000 rounds to 0.01 on its own.
    assert pulse.strengths == [1.0, 0.01, 0.01]
    assert all(0 < strength <= 1 for strength in pulse.strengths)


def test_strengths_round_to_two_decimals() -> None:
    pulse = build_pulse(_input({0: 3.0, 1: 1.0}), RECEPTORS, start_ms=0)

    assert pulse is not None
    assert pulse.strengths == [1.0, 0.33]


def test_cap_keeps_the_strongest_and_lower_index_wins_ties() -> None:
    # 70 receptors: 60 strong ones at distinct levels, then 10 tied weak ones at 0.5. The cap
    # of 64 keeps all 60 strong receptors plus the 4 lowest-indexed tied ones.
    vector = {1000 - index: 2.0 + index for index in range(60)}
    tied = {index: 0.5 for index in range(100, 110)}
    pulse = build_pulse(_input({**vector, **tied}), RECEPTORS, start_ms=0)

    assert pulse is not None
    assert len(pulse.receptors) == MAX_RECEPTORS_PER_PULSE
    assert set(vector) <= set(pulse.receptors)
    assert set(pulse.receptors) - set(vector) == {100, 101, 102, 103}
    assert pulse.receptors == sorted(set(pulse.receptors))
    assert len(pulse.strengths) == len(pulse.receptors)
    assert max(pulse.strengths) == 1.0


def test_receptor_outside_the_input_layer_is_rejected() -> None:
    with pytest.raises(ValueError):
        build_pulse(_input({RECEPTORS: 1.0}), RECEPTORS, start_ms=0)
    with pytest.raises(ValueError):
        build_pulse(_input({-1: 1.0}), RECEPTORS, start_ms=0)


def test_slots_are_sequential_and_share_a_start() -> None:
    stimulus = build_brain_stimulus(
        "Spend signals",
        CIRCUITS,
        RECEPTORS,
        [
            [_input({1: 1.0}, "Charge 1 of 3"), _input({2: 1.0}, "Charge 1 of 3", SensoryInput.visual)],
            [_input({3: 1.0}, "Charge 2 of 3")],
            [_input({4: 1.0}, "Charge 3 of 3")],
        ],
    )

    assert stimulus is not None
    assert [pulse.start_ms for pulse in stimulus.pulses] == [0, 0, PULSE_MS + GAP_MS, 2 * (PULSE_MS + GAP_MS)]
    assert [pulse.sense for pulse in stimulus.pulses[:2]] == [SensoryInput.olfactory, SensoryInput.visual]
    assert stimulus.duration_ms == 2 * (PULSE_MS + GAP_MS) + PULSE_MS + TAIL_MS
    assert stimulus.receptor_count == RECEPTORS
    assert stimulus.circuits == CIRCUITS


def test_a_silent_slot_keeps_its_place_in_the_timeline() -> None:
    stimulus = build_brain_stimulus(
        "Spend signals",
        CIRCUITS,
        RECEPTORS,
        [[_input({1: 1.0})], [_input({})], [_input({3: 1.0})]],
    )

    assert stimulus is not None
    assert [pulse.start_ms for pulse in stimulus.pulses] == [0, 2 * (PULSE_MS + GAP_MS)]


def test_duration_ends_after_the_last_pulse_even_when_later_slots_are_silent() -> None:
    stimulus = build_brain_stimulus("Similar listings", CIRCUITS, RECEPTORS, [[_input({1: 1.0})], [_input({})]])

    assert stimulus is not None
    assert stimulus.duration_ms == PULSE_MS + TAIL_MS


def test_no_circuit_or_no_active_input_means_no_stimulus() -> None:
    assert build_brain_stimulus("Similar listings", [], RECEPTORS, [[_input({1: 1.0})]]) is None
    assert build_brain_stimulus("Similar listings", CIRCUITS, RECEPTORS, [[_input({})]]) is None
    assert build_brain_stimulus("Similar listings", CIRCUITS, RECEPTORS, []) is None


def test_more_than_the_slot_cap_is_a_caller_bug() -> None:
    slots = [[_input({index: 1.0})] for index in range(MAX_SLOTS + 1)]

    with pytest.raises(ValueError):
        build_brain_stimulus("Spend signals", CIRCUITS, RECEPTORS, slots)


def test_the_same_input_always_gives_the_same_stimulus() -> None:
    vector = {index * 7 % RECEPTORS: float(index % 5 + 1) for index in range(200)}

    first = build_brain_stimulus("Similar listings", CIRCUITS, RECEPTORS, [[_input(vector)]])
    second = build_brain_stimulus("Similar listings", CIRCUITS, RECEPTORS, [[_input(dict(reversed(vector.items())))]])

    assert first is not None and first == second
