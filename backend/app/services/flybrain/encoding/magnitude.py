"""Encodes a positive magnitude (an amount, a square footage) as a population code.
Neighbouring receptors have overlapping tuning, so nearby values share receptors and far values don't.
"""

import math

from app.services.flybrain.encoding.receptor_hash import receptor_index
from app.services.flybrain.sparse_vector import SparseVector


def encode_log_magnitude(
    value: float,
    channel: str,
    receptor_count: int,
    step_ratio: float,
    spread: int,
) -> SparseVector:
    """Encode a positive value with receptors tuned to log-spaced bands.

    step_ratio is the ratio between adjacent receptor centres (1.02 means each band
    is 2% wider than the last), so similarity depends on relative difference: $185
    versus $189 looks as close as $2,400 versus $2,450. spread is how many
    neighbouring bands respond on each side, with activation falling off linearly.
    Values that differ by more than about step_ratio ** (2 * spread) share nothing.

    The value is used only to choose receptors; it is never turned back into money.
    """

    if value <= 0:
        raise ValueError("Magnitude encoding requires a positive value")
    if step_ratio <= 1.0 or spread < 0:
        raise ValueError("step_ratio must exceed 1.0 and spread must be non-negative")

    position = math.log(value) / math.log(step_ratio)
    nearest_band = math.floor(position)
    vector: SparseVector = {}
    for band in range(nearest_band - spread, nearest_band + spread + 2):
        # Triangular tuning curve centred on the exact position, so the code varies
        # smoothly with the value instead of jumping at band edges.
        activation = 1.0 - abs(band - position) / (spread + 1)
        if activation <= 0:
            continue
        index = receptor_index(channel, str(band), receptor_count)
        vector[index] = vector.get(index, 0.0) + activation
    return vector
