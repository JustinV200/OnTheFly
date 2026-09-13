"""Brain stimulus: the receptor input a fly-brain circuit consumed, described for replay in a whole-brain simulation.
It only re-presents vectors a circuit already read; it never changes a circuit's result or decides anything.
"""

from app.services.flybrain.brain_stimulus.build import (
    GAP_MS,
    MAX_RECEPTORS_PER_PULSE,
    MAX_SLOTS,
    MIN_STRENGTH,
    PULSE_MS,
    TAIL_MS,
    StimulusInput,
    build_brain_stimulus,
    build_pulse,
    slot_start_ms,
)
from app.services.flybrain.brain_stimulus.contract import BrainStimulus, SensoryInput, StimulusPulse

__all__ = [
    "BrainStimulus",
    "GAP_MS",
    "MAX_RECEPTORS_PER_PULSE",
    "MAX_SLOTS",
    "MIN_STRENGTH",
    "PULSE_MS",
    "SensoryInput",
    "StimulusInput",
    "StimulusPulse",
    "TAIL_MS",
    "build_brain_stimulus",
    "build_pulse",
    "slot_start_ms",
]
