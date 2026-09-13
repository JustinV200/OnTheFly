"""Builds the per-neuron table: the order neurons are stored in, their positions, sides and display groups.
It joins the model's neuron list to the annotations; it never reads or changes connectivity.
"""

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

from display_groups import UNPLACED_GROUP_ID, assign_display_groups

# FlyWire annotation positions are voxel coordinates at 4 x 4 x 40 nm (flywire_annotations supplemental README).
VOXEL_SIZE_NM = np.array([4.0, 4.0, 40.0])


@dataclass(frozen=True, slots=True)
class NeuronTable:
    """Every model neuron in stored order, with what the viewer and the input tables need to know about it."""

    # root_ids[i] is the FlyWire release-783 id of stored neuron i.
    root_ids: np.ndarray
    # stored_index_of_model_index[k] is where the model's neuron k (a Completeness_783.csv row) is stored.
    stored_index_of_model_index: np.ndarray
    positions_nm: np.ndarray
    groups: np.ndarray
    sides: np.ndarray
    # The annotation row for each stored neuron (NaN-filled where a neuron has no annotation).
    annotations: pd.DataFrame


def build_neuron_table(completeness_path: Path, annotations_path: Path) -> NeuronTable:
    """Join the model's neuron list with annotations and choose the stored order.

    Neurons are stored sorted by super class, cell class, cell type and side. Connected neurons then tend to have
    nearby indices, which makes the delta-encoded connection lists about a third smaller; the simulation is
    unaffected because every index is remapped consistently.
    """

    model_ids = pd.read_csv(completeness_path, index_col=0).index.to_numpy()
    annotations = pd.read_csv(annotations_path, sep="\t", low_memory=False).drop_duplicates("root_id").set_index("root_id")
    aligned = annotations.reindex(model_ids)

    keys = aligned[["super_class", "cell_class", "cell_type", "side"]].fillna("~").astype(str)
    # np.lexsort sorts by the last key first; pos_y breaks ties so each cell type is stored top to bottom.
    stored_order = np.lexsort(
        (
            aligned["pos_y"].fillna(0).to_numpy(),
            keys["side"].to_numpy(),
            keys["cell_type"].to_numpy(),
            keys["cell_class"].to_numpy(),
            keys["super_class"].to_numpy(),
        )
    )
    stored_index_of_model_index = np.empty(len(model_ids), dtype=np.int64)
    stored_index_of_model_index[stored_order] = np.arange(len(model_ids))

    stored = aligned.iloc[stored_order]
    groups = assign_display_groups(stored.reset_index())
    positions = stored[["pos_x", "pos_y", "pos_z"]].to_numpy(dtype=np.float64) * VOXEL_SIZE_NM
    is_unplaced = np.isnan(positions).any(axis=1) | (groups == UNPLACED_GROUP_ID)
    groups[is_unplaced] = UNPLACED_GROUP_ID
    # Unplaced neurons still need a finite position for quantisation; the viewer hides them by group.
    positions[is_unplaced] = np.nanmean(positions[~is_unplaced], axis=0)

    return NeuronTable(
        root_ids=model_ids[stored_order],
        stored_index_of_model_index=stored_index_of_model_index,
        positions_nm=positions,
        groups=groups,
        sides=stored["side"].fillna("na").astype(str).to_numpy(),
        annotations=stored.reset_index(),
    )
