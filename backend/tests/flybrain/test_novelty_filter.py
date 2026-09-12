"""Checks the mushroom-body novelty filter: familiarity, distance sensitivity, and forgetting."""

import pytest

from app.services.flybrain import FlyHash, MushroomBodyShape, NoveltyFilter, encode_log_magnitude

SHAPE = MushroomBodyShape(input_dim=1024, kenyon_cells=4000, fan_in=3, tag_size=200, seed=20170)


def _amount_tag(flyhash: FlyHash, amount_minor: int) -> frozenset[int]:
    return flyhash.tag(encode_log_magnitude(float(amount_minor), "amount", SHAPE.input_dim, step_ratio=1.02, spread=2))


def test_unseen_input_is_fully_novel_and_seen_input_is_familiar() -> None:
    flyhash = FlyHash(SHAPE)
    memory = NoveltyFilter(learning_rate=1.0, memory_half_life=None)
    tag = _amount_tag(flyhash, 240000)

    assert memory.novelty(tag) == 1.0
    memory.observe(tag)
    assert memory.novelty(tag) == 0.0


def test_novelty_grows_with_distance_from_what_was_seen() -> None:
    flyhash = FlyHash(SHAPE)
    memory = NoveltyFilter(learning_rate=1.0, memory_half_life=None)
    memory.observe(_amount_tag(flyhash, 240000))

    near = memory.novelty(_amount_tag(flyhash, 241000))
    ten_percent = memory.novelty(_amount_tag(flyhash, 265000))
    far = memory.novelty(_amount_tag(flyhash, 90000))

    assert near < 0.2
    assert near < ten_percent < far
    assert ten_percent >= 0.5
    assert far > 0.95


def test_partial_learning_rate_needs_repeats() -> None:
    flyhash = FlyHash(SHAPE)
    memory = NoveltyFilter(learning_rate=0.5, memory_half_life=None)
    tag = _amount_tag(flyhash, 18500)

    memory.observe(tag)
    once = memory.novelty(tag)
    memory.observe(tag)

    assert once == pytest.approx(0.5)
    assert memory.novelty(tag) == pytest.approx(0.25)


def test_familiarity_fades_with_the_configured_half_life() -> None:
    flyhash = FlyHash(SHAPE)
    memory = NoveltyFilter(learning_rate=1.0, memory_half_life=365.0)
    tag = _amount_tag(flyhash, 18500)
    memory.observe(tag)

    memory.elapse(365.0)

    assert memory.novelty(tag) == pytest.approx(0.5)


def test_empty_tag_and_invalid_parameters_are_rejected() -> None:
    memory = NoveltyFilter(learning_rate=1.0, memory_half_life=None)

    with pytest.raises(ValueError):
        memory.novelty(frozenset())
    with pytest.raises(ValueError):
        memory.elapse(-1.0)
    with pytest.raises(ValueError):
        NoveltyFilter(learning_rate=0.0, memory_half_life=None)
    with pytest.raises(ValueError):
        NoveltyFilter(learning_rate=1.0, memory_half_life=0.0)
