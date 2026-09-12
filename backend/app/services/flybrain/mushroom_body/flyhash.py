"""Implements FlyHash: sparse random expansion followed by winner-take-all.
Similar inputs get overlapping tags; this is the fly's similarity-search algorithm.
"""

from functools import lru_cache

from app.services.flybrain.mushroom_body.connectivity import KenyonConnectivity, MushroomBodyShape
from app.services.flybrain.sparse_vector import SparseVector

# Kenyon cell indices that fired for one input.
KenyonTag = frozenset[int]

# Drive values are sums of floats; rounding before sorting keeps the winner set
# identical when the same total is reached by adding in a different order.
DRIVE_PRECISION = 9


class FlyHash:
    """Turns a receptor vector into a sparse Kenyon-cell tag.

    Reference: Dasgupta, Stevens & Navlakha, "A neural algorithm for a fundamental
    computing problem", Science 358 (2017). The paper's first step, normalising the
    input, is skipped: winner-take-all only compares drives within one input, so
    scaling that input doesn't change which cells win.
    """

    def __init__(self, shape: MushroomBodyShape) -> None:
        self.shape = shape
        self._connectivity = KenyonConnectivity(shape)

    def tag(self, vector: SparseVector) -> KenyonTag:
        """Return the indices of the most strongly driven Kenyon cells.

        Only cells with positive drive can win. The fly's inhibitory feedback lets
        silent cells stay silent, and letting them win would give unrelated sparse
        inputs shared "noise" cells that look like similarity. A very sparse input
        can therefore produce a tag smaller than tag_size.
        """

        drive: dict[int, float] = {}
        for input_index, activation in vector.items():
            if activation < 0:
                raise ValueError("Receptor activations must be non-negative")
            if activation == 0:
                continue
            if not 0 <= input_index < self.shape.input_dim:
                raise ValueError(f"Receptor index {input_index} is outside the input layer")
            for cell in self._connectivity.cells_driven_by(input_index):
                drive[cell] = drive.get(cell, 0.0) + activation

        ranked = sorted(
            drive.items(),
            key=lambda item: (-round(item[1], DRIVE_PRECISION), self._connectivity.tie_break_rank(item[0])),
        )
        return frozenset(cell for cell, _ in ranked[: self.shape.tag_size])


def tag_similarity(left: KenyonTag, right: KenyonTag) -> float:
    """Return Jaccard overlap of two tags in [0, 1]; 0.0 when both are empty."""

    union = len(left | right)
    if union == 0:
        return 0.0
    return len(left & right) / union


@lru_cache(maxsize=16)
def build_flyhash(shape: MushroomBodyShape) -> FlyHash:
    """Return a shared FlyHash for a shape; wiring is built once per process.

    The shape is frozen and fully determines the wiring, so sharing an instance
    between callers is safe.
    """

    return FlyHash(shape)
