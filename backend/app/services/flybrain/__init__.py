"""Deterministic, fruit-fly-inspired analysis circuits shared by product features.

- Mushroom Body: FlyHash similarity search and a novelty filter.
- Compound Eye: contrast adaptation that separates real level changes from one-off flashes.
- Brain stimulus: the receptor input a circuit consumed, timed for replay in a whole-brain simulation.

Nothing here touches the database, HTTP, money, or a model. The circuits only rank,
flag, or segment, and every product decision built on them stays owner-confirmed
or deterministic. They are never used to decide that two businesses are the same
entity; see CLAUDE.md, "Evidence and claims".
"""

from app.services.flybrain.attribution import FlyBrainAttribution, FlyBrainComponent, attribute
from app.services.flybrain.brain_stimulus import (
    MAX_SLOTS,
    BrainStimulus,
    SensoryInput,
    StimulusInput,
    StimulusPulse,
    build_brain_stimulus,
)
from app.services.flybrain.compound_eye import AdaptationTrace, ContrastAdaptation, LevelShift, SampleResponse
from app.services.flybrain.encoding import encode_log_magnitude, encode_tokens, encode_trigrams, text_words
from app.services.flybrain.mushroom_body import (
    FlyHash,
    FlyHashIndex,
    IndexMatch,
    KenyonTag,
    MushroomBodyShape,
    NoveltyFilter,
    build_flyhash,
    tag_similarity,
)
from app.services.flybrain.sparse_vector import SparseVector, cosine_similarity, merge_vectors, scale_vector

__all__ = [
    "AdaptationTrace",
    "BrainStimulus",
    "ContrastAdaptation",
    "FlyBrainAttribution",
    "FlyBrainComponent",
    "FlyHash",
    "FlyHashIndex",
    "IndexMatch",
    "KenyonTag",
    "LevelShift",
    "MAX_SLOTS",
    "MushroomBodyShape",
    "NoveltyFilter",
    "SampleResponse",
    "SensoryInput",
    "SparseVector",
    "StimulusInput",
    "StimulusPulse",
    "attribute",
    "build_brain_stimulus",
    "build_flyhash",
    "cosine_similarity",
    "encode_log_magnitude",
    "encode_tokens",
    "encode_trigrams",
    "merge_vectors",
    "scale_vector",
    "tag_similarity",
    "text_words",
]
