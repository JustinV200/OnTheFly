"""Defines the sparse receptor-activation vector every fly-brain circuit consumes.
Vectors are plain index-to-activation maps so encoders and circuits agree on one shape.
"""

import math

# Receptor index -> activation. Activations are non-negative firing rates; an absent
# index means the receptor is silent. A dict (not a dense list) because encoders
# light up a handful of receptors out of a few hundred.
SparseVector = dict[int, float]


def merge_vectors(*vectors: SparseVector) -> SparseVector:
    """Sum several receptor channels into one vector; overlapping indices add."""

    merged: SparseVector = {}
    for vector in vectors:
        for index, activation in vector.items():
            merged[index] = merged.get(index, 0.0) + activation
    return merged


def scale_vector(vector: SparseVector, factor: float) -> SparseVector:
    """Return a copy with every activation multiplied by a non-negative factor."""

    if factor < 0:
        raise ValueError("Receptor activations cannot be scaled by a negative factor")
    return {index: activation * factor for index, activation in vector.items()}


def cosine_similarity(left: SparseVector, right: SparseVector) -> float:
    """Return exact cosine similarity in [0, 1]; 0.0 when either vector is silent.

    This is the exact comparison FlyHash approximates. Retrieval uses it to re-rank
    FlyHash candidates so the final order never depends on the hash's approximation.
    """

    if not left or not right:
        return 0.0
    # Iterate the smaller map; only shared indices contribute to the dot product.
    small, large = (left, right) if len(left) <= len(right) else (right, left)
    dot = sum(activation * large.get(index, 0.0) for index, activation in small.items())
    left_norm = math.sqrt(sum(activation * activation for activation in left.values()))
    right_norm = math.sqrt(sum(activation * activation for activation in right.values()))
    if left_norm == 0.0 or right_norm == 0.0:
        return 0.0
    return max(0.0, min(1.0, dot / (left_norm * right_norm)))
