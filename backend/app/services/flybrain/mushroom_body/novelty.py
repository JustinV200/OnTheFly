"""Implements the mushroom body's novelty detector (a "fly Bloom filter").
It answers "have I seen something like this before?" without storing the inputs themselves.
"""

from app.services.flybrain.mushroom_body.flyhash import KenyonTag

# Weights this close to 1.0 are dropped from storage; the filter treats them as fully novel.
FULLY_RECOVERED = 1e-9


class NoveltyFilter:
    """Tracks familiarity as depressed output weights on Kenyon cells.

    Reference: Dasgupta, Sheehan, Stevens & Navlakha, "A neural data structure for
    novelty detection", PNAS 115 (2018). Every Kenyon cell's synapse onto the output
    neuron starts at weight 1. Observing an input depresses the weights of the cells
    in its tag. The novelty of a new input is the mean weight over its tag: 1.0 means
    none of its cells were used before, 0.0 means all of them were.

    The response is distance-sensitive. A similar input shares tag cells and reads as
    partly familiar, which an exact hash set could never do.
    """

    def __init__(
        self,
        learning_rate: float,
        memory_half_life: float | None,
    ) -> None:
        """Create an empty filter.

        learning_rate is the fraction of weight removed per observation (1.0 is the
        paper's binary filter; lower values need repeats to become fully familiar).
        memory_half_life is how much elapsed time halves the depression, or None
        when memory should never fade.
        """

        if not 0.0 < learning_rate <= 1.0:
            raise ValueError("learning_rate must be in (0, 1]")
        if memory_half_life is not None and memory_half_life <= 0:
            raise ValueError("memory_half_life must be positive when set")
        self._learning_rate = learning_rate
        self._memory_half_life = memory_half_life
        # Only depressed cells are stored; an absent cell has weight 1.0.
        self._weights: dict[int, float] = {}

    def novelty(self, tag: KenyonTag) -> float:
        """Return the mean output weight over a tag, in [0, 1].

        Raises for an empty tag: an input with no active receptors carries no
        evidence either way, and callers must report it as not assessed, not novel.
        """

        if not tag:
            raise ValueError("Cannot score novelty for an empty tag")
        return sum(self._weights.get(cell, 1.0) for cell in tag) / len(tag)

    def observe(self, tag: KenyonTag) -> None:
        """Depress the weights of the cells in a tag so similar inputs read as familiar."""

        retained = 1.0 - self._learning_rate
        for cell in tag:
            self._weights[cell] = self._weights.get(cell, 1.0) * retained

    def elapse(self, duration: float) -> None:
        """Let familiarity fade toward novel as time passes; no-op without a half-life."""

        if duration < 0:
            raise ValueError("Elapsed duration cannot be negative")
        if self._memory_half_life is None or duration == 0:
            return
        # Depression (1 - weight) decays exponentially with the configured half-life.
        remaining = 0.5 ** (duration / self._memory_half_life)
        recovered: dict[int, float] = {}
        for cell, weight in self._weights.items():
            updated = 1.0 - (1.0 - weight) * remaining
            if 1.0 - updated > FULLY_RECOVERED:
                recovered[cell] = updated
        self._weights = recovered
