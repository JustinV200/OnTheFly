"""Encodes short text (vendor names, descriptions, scope summaries) as receptor activations.
Character trigrams make the code tolerant of suffixes, plurals, and processor noise.
"""

import re

from app.services.flybrain.encoding.receptor_hash import receptor_index
from app.services.flybrain.sparse_vector import SparseVector

NON_ALPHANUMERIC_RE = re.compile(r"[^0-9a-z]+")


def text_words(text: str) -> list[str]:
    """Return lowercase alphanumeric words, splitting on everything else."""

    return [word for word in NON_ALPHANUMERIC_RE.split(text.casefold()) if word]


def encode_trigrams(words: list[str], channel: str, receptor_count: int) -> SparseVector:
    """Encode words as padded character trigrams hashed onto receptors.

    Each word is padded with spaces so word boundaries become features: " sp" and
    "ng " distinguish a word's start and end from the same letters mid-word.
    Repeated trigrams add, so activation reflects how often a fragment appears.
    """

    vector: SparseVector = {}
    for word in words:
        padded = f" {word} "
        for start in range(len(padded) - 2):
            index = receptor_index(channel, padded[start : start + 3], receptor_count)
            vector[index] = vector.get(index, 0.0) + 1.0
    return vector


def encode_tokens(tokens: list[str], channel: str, receptor_count: int) -> SparseVector:
    """Encode whole tokens (not fragments) as one receptor each.

    Used where near-spellings must NOT look alike, such as "2x weekly" versus
    "3x weekly" in a scope summary.
    """

    vector: SparseVector = {}
    for token in tokens:
        index = receptor_index(channel, token, receptor_count)
        vector[index] = vector.get(index, 0.0) + 1.0
    return vector
