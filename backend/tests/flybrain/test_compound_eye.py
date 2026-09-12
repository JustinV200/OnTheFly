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
