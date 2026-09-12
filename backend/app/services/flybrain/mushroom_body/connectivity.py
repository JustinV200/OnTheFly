"""Builds the fixed random wiring from input receptors to Kenyon cells.
Each Kenyon cell samples a small random subset of inputs, as in the fly mushroom body.
"""

from dataclasses import dataclass
import random


@dataclass(frozen=True, slots=True)
class MushroomBodyShape:
    """Sizes and seed for one mushroom-body circuit.

    The pattern follows Dasgupta, Stevens & Navlakha (Science, 2017): expand a small
    input layer into many more Kenyon cells, have each cell sample a few inputs, and
    keep about 5% of cells as the tag. The seed makes the wiring reproducible, so the
    same input produces the same tag in every process.
    """

    input_dim: int
    kenyon_cells: int
    fan_in: int
    tag_size: int
    seed: int

    def __post_init__(self) -> None:
        if self.input_dim <= 0 or self.kenyon_cells <= 0:
            raise ValueError("Input and Kenyon cell counts must be positive")
        if not 0 < self.fan_in <= self.input_dim:
            raise ValueError("fan_in must be between 1 and input_dim")
        if not 0 < self.tag_size <= self.kenyon_cells:
            raise ValueError("tag_size must be between 1 and kenyon_cells")


class KenyonConnectivity:
    """Holds the sparse binary projection matrix in inverted (input -> cells) form."""

    def __init__(self, shape: MushroomBodyShape) -> None:
        # A private Random instance keeps wiring independent of global random state.
        generator = random.Random(shape.seed)
        targets: list[list[int]] = [[] for _ in range(shape.input_dim)]
        for cell in range(shape.kenyon_cells):
            # Constant fan-in matters: every cell integrates the same number of inputs,
            # so no cell wins the winner-take-all just for having more synapses.
            for input_index in generator.sample(range(shape.input_dim), shape.fan_in):
                targets[input_index].append(cell)
        self._targets: tuple[tuple[int, ...], ...] = tuple(tuple(cells) for cells in targets)

        # Tie-break order for cells with identical drive. A random permutation (rather
        # than cell number) avoids systematically preferring low-numbered cells.
        priority = list(range(shape.kenyon_cells))
        generator.shuffle(priority)
        self._priority: tuple[int, ...] = tuple(priority)

    def cells_driven_by(self, input_index: int) -> tuple[int, ...]:
        """Return the Kenyon cells that receive a synapse from one input."""

        return self._targets[input_index]

    def tie_break_rank(self, cell: int) -> int:
        """Return the fixed tie-break rank of a cell; lower wins among equal drive."""

        return self._priority[cell]
