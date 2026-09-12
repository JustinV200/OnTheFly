"""Checks FlyHash determinism, sparsity, and that tag overlap tracks exact similarity."""

import itertools
import os
import statistics
import subprocess
import sys

import pytest

from app.services.flybrain import (
    FlyHash,
    FlyHashIndex,
    MushroomBodyShape,
    cosine_similarity,
    encode_trigrams,
    tag_similarity,
    text_words,
)

SHAPE = MushroomBodyShape(input_dim=1024, kenyon_cells=4000, fan_in=3, tag_size=200, seed=2017)

VENDOR_NAMES = [
    "sparkle clean", "sparkle cleaning", "sparkle cleaning services", "bright cleaning", "orkin pest control",
    "orkin", "office depot", "officemax", "green thumb landscaping", "green thumb lawn", "golden gate janitorial",
    "bay clean pro", "bay area cleaning", "summit building services", "teamline software",
    "midtown parking services", "northstar office supply", "north star supplies", "abc cleaning",
    "abc janitorial", "pacific pest", "terminix", "waste management", "recology", "comcast business",
]


def _receptors(text: str) -> dict[int, float]:
    return encode_trigrams(text_words(text), channel="vendor_name", receptor_count=SHAPE.input_dim)


def test_same_shape_produces_identical_tags() -> None:
    first = FlyHash(SHAPE).tag(_receptors("Sparkle Clean"))
    second = FlyHash(SHAPE).tag(_receptors("Sparkle Clean"))

    assert first == second
    assert 0 < len(first) <= SHAPE.tag_size


def test_tags_do_not_depend_on_python_hash_randomization() -> None:
    # Python salts str hashes per process; a tag built on hash() would change on restart.
    script = (
        "from app.services.flybrain import FlyHash, MushroomBodyShape, encode_trigrams, text_words;"
        "shape = MushroomBodyShape(input_dim=1024, kenyon_cells=4000, fan_in=3, tag_size=200, seed=2017);"
        "print(sorted(FlyHash(shape).tag(encode_trigrams(text_words('Sparkle Clean'), 'vendor_name', 1024))))"
    )
    outputs = set()
    for seed in ("1", "2"):
        environment = {**os.environ, "PYTHONHASHSEED": seed}
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        completed = subprocess.run(
            [sys.executable, "-c", script], capture_output=True, text=True, check=True, env=environment, cwd=backend_dir
        )
        outputs.add(completed.stdout)

    assert len(outputs) == 1


def test_silent_cells_never_join_a_tag() -> None:
    flyhash = FlyHash(SHAPE)

    tag = flyhash.tag({7: 1.0})

    # One active receptor drives only the cells wired to it, far fewer than tag_size.
    assert 0 < len(tag) < SHAPE.tag_size
    assert flyhash.tag({}) == frozenset()


def test_rejects_negative_and_out_of_range_activations() -> None:
    flyhash = FlyHash(SHAPE)

    with pytest.raises(ValueError):
        flyhash.tag({1: -0.5})
    with pytest.raises(ValueError):
        flyhash.tag({SHAPE.input_dim: 1.0})


def test_similar_names_share_more_cells_than_unrelated_names() -> None:
    flyhash = FlyHash(SHAPE)
    sparkle = flyhash.tag(_receptors("Sparkle Clean"))

    assert tag_similarity(sparkle, flyhash.tag(_receptors("Sparkle Cleaning"))) > 0.5
    assert tag_similarity(sparkle, flyhash.tag(_receptors("Office Depot"))) < 0.1


def test_tag_overlap_tracks_exact_cosine_on_vendor_names() -> None:
    # Locks in the tuning behind the product shape: if a shape change degrades how well
    # the hash approximates exact similarity, this fails before any feature ships it.
    flyhash = FlyHash(SHAPE)
    vectors = {name: _receptors(name) for name in VENDOR_NAMES}
    tags = {name: flyhash.tag(vector) for name, vector in vectors.items()}
    exact: list[float] = []
    hashed: list[float] = []
    for left, right in itertools.combinations(VENDOR_NAMES, 2):
        exact.append(cosine_similarity(vectors[left], vectors[right]))
        hashed.append(tag_similarity(tags[left], tags[right]))
        # Every clearly related pair must be a retrieval candidate (share a cell).
        if exact[-1] >= 0.3:
            assert tags[left] & tags[right], f"{left!r} and {right!r} share no Kenyon cell"

    assert statistics.correlation(exact, hashed) > 0.95


def test_index_orders_by_exact_similarity_and_honours_exclusions() -> None:
    index: FlyHashIndex[str] = FlyHashIndex(FlyHash(SHAPE))
    for name in VENDOR_NAMES:
        index.add(name, _receptors(name))

    matches = index.query(_receptors("sparkle clean"), limit=3, min_similarity=0.3, exclude={"sparkle clean"})

    assert [match.key for match in matches][:2] == ["sparkle cleaning", "sparkle cleaning services"]
    assert all(match.key != "sparkle clean" for match in matches)
    assert [match.similarity for match in matches] == sorted((match.similarity for match in matches), reverse=True)


def test_index_readd_replaces_previous_vector() -> None:
    index: FlyHashIndex[str] = FlyHashIndex(FlyHash(SHAPE))
    index.add("vendor", _receptors("office depot"))
    index.add("vendor", _receptors("sparkle clean"))

    matches = index.query(_receptors("office depot"), limit=5, min_similarity=0.3)

    assert matches == []
