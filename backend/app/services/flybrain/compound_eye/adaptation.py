"""Detects sustained level changes in a sequence, modelled on fly photoreceptor adaptation.
It tells a real step (a new price) apart from a brief flash (a one-off charge) and an unconfirmed jump.
"""

from dataclasses import dataclass
from enum import StrEnum
import math


class SampleResponse(StrEnum):
    """How the detector responded to one sample."""

    # The first sample of the opening level; no established level before it to compare against.
    initial = "initial"
    # Within the contrast threshold of the adapted level.
    adapted = "adapted"
    # A large contrast that the following sample did not sustain (a flash).
    transient = "transient"
    # The first sample of a new level that later samples confirmed (a step).
    shift = "shift"
    # A large contrast at the end of the sequence with too few samples after it to judge.
    pending = "pending"
    # An opening sample whose level a confirmed step replaced before enough samples held it.
    # Not a step (its level was never established) and not a flash (a real level that
    # changed right after the sequence began looks the same), so it is neither.
    unconfirmed = "unconfirmed"


# Responses that count a sample as a member of the level it sits in.
LEVEL_MEMBER_RESPONSES = frozenset({SampleResponse.initial, SampleResponse.adapted, SampleResponse.shift})


@dataclass(frozen=True, slots=True)
class LevelShift:
    """One confirmed step from an established level to a new one."""

    index: int
    contrast: float


@dataclass(frozen=True, slots=True)
class AdaptationTrace:
    """The detector's full response to a sequence.

    current_level_start is where the latest level begins. Every level after the
    opening one is confirmed; the opening level may still be short of
    confirmations + 1 samples if no step followed it, so callers check its size.
    A trailing pending run is excluded from that level until it is confirmed or refuted.
    """

    responses: tuple[SampleResponse, ...]
    shifts: tuple[LevelShift, ...]
    current_level_start: int


@dataclass(frozen=True, slots=True)
class ContrastAdaptation:
    """Parameters for the level-change detector.

    Photoreceptors report Weber contrast, a change relative to the light level they
    have adapted to, rather than absolute intensity. This detector does the same in
    log space, so a 10% rise reads the same at $185 as at $2,400:

    - contrast_threshold: smallest relative change treated as a response
      (0.05 means 5%).
    - adaptation_rate: how far the adapted level moves toward each in-threshold
      sample, so small drift is absorbed rather than reported.
    - confirmations: how many following samples must hold the new level before a
      jump counts as a step. The decision is delayed by that many samples, like a
      delay line.
    """

    contrast_threshold: float
    adaptation_rate: float
    confirmations: int

    def __post_init__(self) -> None:
        if self.contrast_threshold <= 0:
            raise ValueError("contrast_threshold must be positive")
        if not 0.0 <= self.adaptation_rate <= 1.0:
            raise ValueError("adaptation_rate must be in [0, 1]")
        if self.confirmations < 1:
            raise ValueError("confirmations must be at least 1")

    def run(self, samples: list[float]) -> AdaptationTrace:
        """Classify every sample in order; samples must all be positive."""

        if not samples:
            raise ValueError("Cannot adapt to an empty sequence")
        if any(sample <= 0 for sample in samples):
            raise ValueError("Contrast adaptation requires positive samples")

        log_samples = [math.log(sample) for sample in samples]
        threshold = math.log1p(self.contrast_threshold)
        responses: list[SampleResponse] = [SampleResponse.initial]
        shifts: list[LevelShift] = []
        adapted_level = log_samples[0]
        current_level_start = 0
        index = 1

        while index < len(log_samples):
            contrast = log_samples[index] - adapted_level
            if abs(contrast) < threshold:
                responses.append(SampleResponse.adapted)
                adapted_level += self.adaptation_rate * contrast
                index += 1
                continue

            # A large contrast. Look at the samples that follow: if they hold the new
            # level it's a step, if they don't it was a flash.
            candidate_level = log_samples[index]
            run_end = index + 1
            while (
                run_end < len(log_samples)
                and run_end - index <= self.confirmations
                and abs(log_samples[run_end] - candidate_level) < threshold
            ):
                run_end += 1
            held_for = run_end - index - 1

            if held_for >= self.confirmations:
                level_members = [
                    position
                    for position in range(current_level_start, index)
                    if responses[position] in LEVEL_MEMBER_RESPONSES
                ]
                # A step needs an established level to step from: confirmations + 1
                # samples, the same standard the new level just met. Every level after
                # the opening one starts that way, so only the opening level falls short.
                if len(level_members) > self.confirmations:
                    shifts.append(LevelShift(index=index, contrast=math.expm1(candidate_level - adapted_level)))
                    responses.append(SampleResponse.shift)
                else:
                    # Reporting a change here would measure it from a level nothing held.
                    # Flashes inside the opening stay flashes; they were judged on their own.
                    for position in level_members:
                        responses[position] = SampleResponse.unconfirmed
                    responses.append(SampleResponse.initial)
                responses.extend([SampleResponse.adapted] * held_for)
                # Re-adapt fully to the new level: mean of the confirming run in log space.
                adapted_level = sum(log_samples[index:run_end]) / (run_end - index)
                current_level_start = index
                index = run_end
            elif run_end == len(log_samples):
                # Every remaining sample holds the new level, but not enough of them exist
                # yet to confirm it. Saying "changed" or "one-off" here would be a guess.
                responses.extend([SampleResponse.pending] * (run_end - index))
                index = run_end
            else:
                # Do not adapt to a flash; the level it interrupted is still in force.
                responses.append(SampleResponse.transient)
                index += 1

        return AdaptationTrace(
            responses=tuple(responses),
            shifts=tuple(shifts),
            current_level_start=current_level_start,
        )
