"""Defines the JSON a response carries so the browser can replay a circuit's input into a whole-brain simulation.
The frontend's simulation worker reads these exact field names; change them only together with that worker.
"""

from enum import StrEnum

from pydantic import BaseModel

from app.services.flybrain.attribution import FlyBrainComponent


class SensoryInput(StrEnum):
    """Which sensory pathway of the simulated brain a pulse drives."""

    # Mushroom Body circuits read odour-like codes: text and magnitudes hashed onto receptors.
    olfactory = "olfactory"
    # The Compound Eye reads a changing intensity, so its pulses drive visual input.
    visual = "visual"


class StimulusPulse(BaseModel):
    """One burst of receptor activity: which receptors fire, how strongly, and when.

    start_ms is brain time from the start of the run. receptors are unique and ascending,
    each in [0, receptor_count), and strengths line up with them, each in (0, 1] with the
    strongest exactly 1.0. caption is fixed generic wording ("Charge 3 of 8") and never
    carries a vendor name, description, amount, listing text, or any other user data.
    """

    sense: SensoryInput
    start_ms: int
    duration_ms: int
    caption: str
    receptors: list[int]
    strengths: list[float]


class BrainStimulus(BaseModel):
    """The input sequence the circuits behind one response consumed, ordered for playback.

    circuits lists only the circuits that actually ran for this response. receptor_count is
    the input size of the vectors the pulses came from, and duration_ms is the end of the last
    pulse plus a tail for the response to settle.
    """

    result_label: str
    circuits: list[FlyBrainComponent]
    receptor_count: int
    pulses: list[StimulusPulse]
    duration_ms: int
