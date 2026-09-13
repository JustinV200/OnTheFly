"""Builds the fixed tables that map a fly-brain receptor channel (0..1023) to real sensory neurons.
The app's circuits hash features onto receptor channels; these tables say which neurons a channel stimulates.
The assignment is arbitrary by design and disclosed in the viewer: a real fly does not smell vendor names.
"""

from dataclasses import dataclass

import numpy as np

from neuron_table import NeuronTable

# Must match the circuits' input_dim (backend MushroomBodyShape.input_dim), which is what brain_stimulus sends.
RECEPTOR_COUNT = 1024
NEURONS_PER_RECEPTOR = 8
# A fixed seed makes the table, and so the file, identical on every build.
TABLE_SEED = 783


@dataclass(frozen=True, slots=True)
class InputTable:
    """Stored neuron indices for each receptor channel: row r lists the neurons channel r stimulates."""

    key: str
    label: str
    pool_size: int
    neurons: np.ndarray  # shape (RECEPTOR_COUNT, NEURONS_PER_RECEPTOR), uint32


def olfactory_table(table: NeuronTable) -> InputTable:
    """Map each channel to neurons of one olfactory receptor type (one glomerulus), chosen from both sides.

    Real odours activate receptor types, and every smell receptor neuron of a type expresses the same receptor, so a
    channel stays within one type. Channels are dealt across the types evenly, so no type is over-used.
    """

    annotations = table.annotations
    # Untyped smell receptor neurons are left out: a channel must stay within one known receptor type.
    is_olfactory = (
        (annotations["super_class"] == "sensory")
        & (annotations["cell_class"] == "olfactory")
        & annotations["cell_type"].notna()
    ).to_numpy()
    pool = np.flatnonzero(is_olfactory)
    receptor_types = annotations["cell_type"].to_numpy()[pool]
    type_names = np.array(sorted(set(receptor_types)))

    generator = np.random.default_rng(TABLE_SEED)
    type_of_channel = type_names[generator.permutation(RECEPTOR_COUNT) % len(type_names)]
    neurons = np.empty((RECEPTOR_COUNT, NEURONS_PER_RECEPTOR), dtype=np.uint32)
    for channel, type_name in enumerate(type_of_channel):
        members = pool[receptor_types == type_name]
        # A type with fewer than eight neurons repeats some; a repeated neuron just receives the same drive.
        neurons[channel] = generator.choice(members, NEURONS_PER_RECEPTOR, replace=len(members) < NEURONS_PER_RECEPTOR)
    return InputTable("olfactory", "Smell receptor neurons", len(pool), neurons)


def visual_table(table: NeuronTable) -> InputTable:
    """Map each channel to photoreceptors (R1-6, R7, R8) chosen at random across both eyes."""

    annotations = table.annotations
    is_visual = ((annotations["super_class"] == "sensory") & (annotations["cell_class"] == "visual")).to_numpy()
    pool = np.flatnonzero(is_visual)

    generator = np.random.default_rng(TABLE_SEED + 1)
    neurons = np.empty((RECEPTOR_COUNT, NEURONS_PER_RECEPTOR), dtype=np.uint32)
    for channel in range(RECEPTOR_COUNT):
        neurons[channel] = generator.choice(pool, NEURONS_PER_RECEPTOR, replace=False)
    return InputTable("visual", "Photoreceptors", len(pool), neurons)
