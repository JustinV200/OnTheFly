"""Turns receptor vectors a circuit already consumed into normalized, timed stimulus pulses.
Every rule about strength, receptor caps, and timing lives here, so each surface replays its input the same way.
It never encodes anything itself: callers pass the exact vectors their circuit read.
"""

from collections.abc import Sequence
from dataclasses import dataclass
import math

from app.services.flybrain.attribution import FlyBrainComponent
from app.services.flybrain.brain_stimulus.contract import BrainStimulus, SensoryInput, StimulusPulse
from app.services.flybrain.sparse_vector import SparseVector

# A pulse drives at most this many receptors. Short text and magnitude codes stay under it;
# the cap stops a long charge description from becoming a flood the browser must simulate,
# and keeping the strongest receptors keeps what made that input distinctive.
MAX_RECEPTORS_PER_PULSE = 64

# Two decimals is all the panel can show. A receptor that fired stays audible: a weak
# activation is raised to MIN_STRENGTH rather than rounded to 0, which would read as silent.
STRENGTH_DECIMALS = 2
MIN_STRENGTH = 0.01

# Brain-time milliseconds. Each slot is one input the circuit read, in the order it read
# them. The gap separates inputs on screen (the browser starts each slot from a brain at
# rest, because the model's activity doesn't die down by itself), and the tail leaves time
# to watch the last response spread before the run ends.
PULSE_MS = 150
GAP_MS = 100
TAIL_MS = 300
# Eight slots cap a replay at 7 * 250 + 150 + 300 = 2,200 ms of brain time.
MAX_SLOTS = 8


@dataclass(frozen=True, slots=True)
class StimulusInput:
    """One vector a circuit consumed, the sense it drives, and its generic caption.

    The caption must be fixed wording chosen by the caller, never text taken from user data.
    """

    sense: SensoryInput
    caption: str
    vector: SparseVector


def slot_start_ms(slot: int) -> int:
    """Return when a zero-based slot starts; slots are evenly spaced whether or not they hold a pulse."""

    if slot < 0:
        raise ValueError("A slot index cannot be negative")
    return slot * (PULSE_MS + GAP_MS)


def build_pulse(stimulus_input: StimulusInput, receptor_count: int, start_ms: int) -> StimulusPulse | None:
    """Normalize one consumed vector into a pulse; None when no receptor in it is active.

    Non-positive activations are dropped. Every strength is relative to the vector's own
    peak, so the strongest receptor is exactly 1.0: the simulation replays the pattern of
    the input, not its absolute scale, which differs between encoders. Raises ValueError
    for a receptor outside [0, receptor_count) or a non-finite activation, both of which
    mean the caller passed a vector from a different input layer or a broken encoder.
    """

    if receptor_count <= 0:
        raise ValueError("receptor_count must be positive")
    active: list[tuple[int, float]] = []
    for index, activation in stimulus_input.vector.items():
        if not math.isfinite(activation):
            raise ValueError("Receptor activations must be finite")
        if not 0 <= index < receptor_count:
            raise ValueError(f"Receptor index {index} is outside the input layer")
        if activation > 0:
            active.append((index, activation))
    if not active:
        return None

    # Strongest first, lower receptor index breaking ties, so the cap keeps the same
    # receptors on every run. The first entry is then the peak.
    strongest = sorted(active, key=lambda item: (-item[1], item[0]))[:MAX_RECEPTORS_PER_PULSE]
    peak = strongest[0][1]
    # Indices are unique dict keys, so sorting the pairs orders them by receptor index alone.
    kept = sorted(strongest)
    return StimulusPulse(
        sense=stimulus_input.sense,
        start_ms=start_ms,
        duration_ms=PULSE_MS,
        caption=stimulus_input.caption,
        receptors=[index for index, _ in kept],
        # activation / peak is exactly 1.0 for the peak itself, and at most 1.0 for the rest.
        strengths=[max(MIN_STRENGTH, round(activation / peak, STRENGTH_DECIMALS)) for _, activation in kept],
    )


def build_brain_stimulus(
    result_label: str,
    circuits: Sequence[FlyBrainComponent],
    receptor_count: int,
    slots: Sequence[Sequence[StimulusInput]],
) -> BrainStimulus | None:
    """Assemble the stimulus for one response; None when no circuit ran or no input has an active receptor.

    circuits must list only the circuits that ran. slots are in the order the circuit read
    its inputs, and every input in one slot starts together. A slot whose vectors are all
    silent still takes its place in the timeline, so slot N always starts at the same time.
    Raises ValueError for more than MAX_SLOTS slots: callers choose which inputs to replay,
    so exceeding the cap is a bug, not something to truncate silently.
    """

    if len(slots) > MAX_SLOTS:
        raise ValueError(f"A brain stimulus holds at most {MAX_SLOTS} slots, got {len(slots)}")
    if not circuits:
        return None

    pulses: list[StimulusPulse] = []
    for slot, inputs in enumerate(slots):
        for stimulus_input in inputs:
            pulse = build_pulse(stimulus_input, receptor_count, slot_start_ms(slot))
            if pulse is not None:
                pulses.append(pulse)
    if not pulses:
        return None

    return BrainStimulus(
        result_label=result_label,
        # Order kept, duplicates dropped, so a caller listing a circuit twice can't double-label it.
        circuits=list(dict.fromkeys(circuits)),
        receptor_count=receptor_count,
        # Slots are walked in order, so pulses are already ordered by start_ms.
        pulses=pulses,
        duration_ms=pulses[-1].start_ms + PULSE_MS + TAIL_MS,
    )
