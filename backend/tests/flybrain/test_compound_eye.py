"""Checks Compound Eye contrast adaptation: steps, flashes, drift, and unconfirmed jumps."""

import pytest

from app.services.flybrain import ContrastAdaptation, SampleResponse

DETECTOR = ContrastAdaptation(contrast_threshold=0.05, adaptation_rate=0.25, confirmations=1)


def test_steady_signal_has_no_shifts() -> None:
    trace = DETECTOR.run([240000.0] * 6)

    assert trace.shifts == ()
    assert trace.responses[0] is SampleResponse.initial
    assert set(trace.responses[1:]) == {SampleResponse.adapted}
    assert trace.current_level_start == 0


def test_sustained_step_is_a_confirmed_shift() -> None:
    trace = DETECTOR.run([18500.0, 18500.0, 18500.0, 20500.0, 20500.0])

    assert [shift.index for shift in trace.shifts] == [3]
    assert trace.shifts[0].contrast == pytest.approx(20500 / 18500 - 1)
    assert trace.responses[3] is SampleResponse.shift
    assert trace.current_level_start == 3


def test_brief_flash_is_transient_and_does_not_move_the_level() -> None:
    trace = DETECTOR.run([18500.0, 18500.0, 45000.0, 18500.0, 18500.0])

    assert trace.shifts == ()
    assert trace.responses[2] is SampleResponse.transient
    assert trace.responses[3] is SampleResponse.adapted
    assert trace.current_level_start == 0


def test_flash_followed_by_a_step_reports_both() -> None:
    trace = DETECTOR.run([18500.0, 18500.0, 45000.0, 18500.0, 20500.0, 20500.0, 20500.0])

    assert trace.responses[2] is SampleResponse.transient
    assert [shift.index for shift in trace.shifts] == [4]


def test_trailing_jump_without_confirmation_is_pending() -> None:
    trace = DETECTOR.run([95000.0, 95000.0, 105000.0])

    assert trace.shifts == ()
    assert trace.responses[2] is SampleResponse.pending
    assert trace.current_level_start == 0


@pytest.mark.parametrize("opening", [80000.0, 500000.0])
def test_step_out_of_a_lone_opening_sample_is_not_a_shift(opening: float) -> None:
    # A prorated first month or a setup fee, then the steady price. One sample never
    # formed a level, so leaving it is not a confirmed step, and calling it a flash
    # would be a guess too: a real change after one period looks the same.
    trace = DETECTOR.run([opening, 240000.0, 240000.0, 240000.0])

    assert trace.shifts == ()
    assert trace.responses == (
        SampleResponse.unconfirmed,
        SampleResponse.initial,
        SampleResponse.adapted,
        SampleResponse.adapted,
    )
    assert trace.current_level_start == 1


def test_flash_inside_an_unconfirmed_opening_stays_a_flash() -> None:
    trace = DETECTOR.run([80000.0, 500000.0, 240000.0, 240000.0])

    assert trace.shifts == ()
    assert trace.responses[:3] == (SampleResponse.unconfirmed, SampleResponse.transient, SampleResponse.initial)
    assert trace.current_level_start == 2


def test_opening_level_held_by_a_second_sample_still_steps() -> None:
    trace = DETECTOR.run([18500.0, 18500.0, 20500.0, 20500.0])

    assert [shift.index for shift in trace.shifts] == [2]
    assert trace.responses[0] is SampleResponse.initial
    assert trace.current_level_start == 2


def test_opening_level_needs_as_many_samples_as_any_other_level() -> None:
    # With two confirmations a level is three samples, so two opening samples fall short.
    detector = ContrastAdaptation(contrast_threshold=0.05, adaptation_rate=0.25, confirmations=2)

    short = detector.run([100.0, 100.0, 200.0, 200.0, 200.0])
    held = detector.run([100.0, 100.0, 100.0, 200.0, 200.0, 200.0])

    assert short.shifts == ()
    assert short.responses[:3] == (SampleResponse.unconfirmed, SampleResponse.unconfirmed, SampleResponse.initial)
    assert [shift.index for shift in held.shifts] == [3]


def test_small_variation_is_absorbed_not_reported() -> None:
    trace = DETECTOR.run([240000.0, 244000.0, 239000.0, 243000.0])

    assert trace.shifts == ()
    assert SampleResponse.transient not in trace.responses


def test_invalid_sequences_and_parameters_are_rejected() -> None:
    with pytest.raises(ValueError):
        DETECTOR.run([])
    with pytest.raises(ValueError):
        DETECTOR.run([100.0, 0.0])
    with pytest.raises(ValueError):
        ContrastAdaptation(contrast_threshold=0.0, adaptation_rate=0.25, confirmations=1)
    with pytest.raises(ValueError):
        ContrastAdaptation(contrast_threshold=0.05, adaptation_rate=0.25, confirmations=0)
