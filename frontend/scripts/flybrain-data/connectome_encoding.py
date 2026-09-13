"""Encodes the model's connectivity compactly: outgoing connections per neuron, delta- and varint-encoded.
Every connection is kept (no synapse-count threshold), so the browser runs the same network as Shiu et al.'s model.
"""

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

from neuron_table import NeuronTable


@dataclass(frozen=True, slots=True)
class EncodedConnectome:
    """Byte sections ready to write, plus the counts the file header reports."""

    row_lengths: bytes  # varint per stored neuron: how many outgoing connections it has
    target_deltas: bytes  # varint per connection: target index minus the previous target in the same row
    synapse_counts: bytes  # varint per connection: synapse count minus one (every connection has at least one)
    is_inhibitory: bytes  # uint8 per stored neuron: 1 when its synapses carry a negative sign in the model
    edge_count: int
    synapse_count: int


def encode_connectome(connectivity_path: Path, table: NeuronTable) -> EncodedConnectome:
    """Read the model's connectivity, remap it to stored order and encode it.

    Raises when the file disagrees with the neuron list (an index pointing at a different root id) or when one
    presynaptic neuron has mixed signs, because the file format stores a single sign per neuron.
    """

    frame = pd.read_parquet(connectivity_path)
    model_ids = table.root_ids[table.stored_index_of_model_index]
    if not (model_ids[frame["Presynaptic_Index"].to_numpy()] == frame["Presynaptic_ID"].to_numpy()).all():
        raise ValueError("Connectivity presynaptic indices do not match the completeness neuron order")
    if not (model_ids[frame["Postsynaptic_Index"].to_numpy()] == frame["Postsynaptic_ID"].to_numpy()).all():
        raise ValueError("Connectivity postsynaptic indices do not match the completeness neuron order")

    sources = table.stored_index_of_model_index[frame["Presynaptic_Index"].to_numpy()]
    targets = table.stored_index_of_model_index[frame["Postsynaptic_Index"].to_numpy()]
    counts = frame["Connectivity"].to_numpy(dtype=np.int64)
    signs = frame["Excitatory"].to_numpy(dtype=np.int64)
    if (counts < 1).any():
        raise ValueError("Every connection must have at least one synapse")

    neuron_count = len(table.root_ids)
    is_inhibitory = np.zeros(neuron_count, dtype=np.uint8)
    is_inhibitory[sources[signs < 0]] = 1
    if (is_inhibitory[sources[signs > 0]] == 1).any():
        raise ValueError("A presynaptic neuron has both excitatory and inhibitory connections")

    order = np.lexsort((targets, sources))
    sources, targets, counts = sources[order], targets[order], counts[order]
    starts_row = np.ones(len(sources), dtype=bool)
    starts_row[1:] = sources[1:] != sources[:-1]
    deltas = targets.copy()
    deltas[~starts_row] = targets[~starts_row] - targets[np.flatnonzero(~starts_row) - 1]

    return EncodedConnectome(
        row_lengths=encode_varints(np.bincount(sources, minlength=neuron_count)),
        target_deltas=encode_varints(deltas),
        synapse_counts=encode_varints(counts - 1),
        is_inhibitory=is_inhibitory.tobytes(),
        edge_count=int(len(sources)),
        synapse_count=int(counts.sum()),
    )


def encode_varints(values: np.ndarray) -> bytes:
    """Encode non-negative integers as unsigned LEB128 varints (7 bits per byte, high bit = more bytes follow).

    Vectorised over the array: byte k of every value is written in one pass, which keeps 15 million values fast.
    """

    if (values < 0).any():
        raise ValueError("Varints encode non-negative integers only")
    remaining = values.astype(np.uint64)

    lengths = np.ones(len(remaining), dtype=np.int64)
    probe = remaining >> np.uint64(7)
    while probe.any():
        lengths += probe > 0
        probe >>= np.uint64(7)

    output = np.zeros(int(lengths.sum()), dtype=np.uint8)
    offsets = np.concatenate(([0], np.cumsum(lengths)[:-1]))
    for byte_index in range(int(lengths.max(initial=1))):
        has_byte = lengths > byte_index
        has_more = lengths > byte_index + 1
        low_bits = (remaining[has_byte] & np.uint64(0x7F)).astype(np.uint8)
        output[offsets[has_byte] + byte_index] = low_bits | (has_more[has_byte].astype(np.uint8) << 7)
        remaining[has_byte] >>= np.uint64(7)
    return output.tobytes()
