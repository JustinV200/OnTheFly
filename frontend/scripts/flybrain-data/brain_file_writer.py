"""Writes the gzip-compressed brain file the browser loads: a JSON header followed by binary sections.
The layout is documented in README.md and decoded by frontend/src/features/brainview/connectome/.
"""

import gzip
import json
from pathlib import Path
import struct

import numpy as np

from connectome_encoding import EncodedConnectome
from display_groups import UNPLACED_GROUP_ID, group_anchors
from input_tables import NEURONS_PER_RECEPTOR, RECEPTOR_COUNT, InputTable
from neuron_table import NeuronTable

MAGIC = b"FLYB"
FORMAT_VERSION = 1
# int16 positions: the brain is under a millimetre across, so a step of ~15 nm is far below what a pixel shows.
POSITION_LIMIT = 32000


def write_brain_file(
    output_path: Path,
    table: NeuronTable,
    connectome: EncodedConnectome,
    inputs: list[InputTable],
    provenance: dict[str, object],
) -> dict[str, object]:
    """Write the file and return its header.

    Layout: "FLYB", uint32 format version, uint32 header byte length, UTF-8 JSON header, then each section's bytes in
    the order the header's "sections" list gives. All integers are little-endian. gzip mtime is fixed at 0 so the same
    inputs always produce a byte-identical file.
    """

    centre = (table.positions_nm.min(axis=0) + table.positions_nm.max(axis=0)) / 2
    step_nm = float(np.abs(table.positions_nm - centre).max() / POSITION_LIMIT)
    quantised = np.round((table.positions_nm - centre) / step_nm).astype(np.int16)

    sections: list[tuple[str, str, bytes]] = [
        ("positions", "int16 x3 per neuron", quantised.tobytes()),
        ("display_groups", "uint8 per neuron", table.groups.tobytes()),
        ("is_inhibitory", "uint8 per neuron", connectome.is_inhibitory),
        ("row_lengths", "varint per neuron", connectome.row_lengths),
        ("target_deltas", "varint per connection", connectome.target_deltas),
        ("synapse_counts_minus_one", "varint per connection", connectome.synapse_counts),
    ]
    sections += [
        (f"inputs_{input_table.key}", "uint32 per receptor x neurons_per_receptor", input_table.neurons.tobytes())
        for input_table in inputs
    ]

    header: dict[str, object] = {
        "format_version": FORMAT_VERSION,
        "neuron_count": int(len(table.root_ids)),
        "edge_count": connectome.edge_count,
        "synapse_count": connectome.synapse_count,
        "position": {"centre_nm": [round(float(value)) for value in centre], "step_nm": step_nm},
        "groups": group_anchors(table.positions_nm, table.groups, table.sides),
        "unplaced_neuron_count": int((table.groups == UNPLACED_GROUP_ID).sum()),
        "inputs": {
            "receptor_count": RECEPTOR_COUNT,
            "neurons_per_receptor": NEURONS_PER_RECEPTOR,
            "senses": [
                {"key": input_table.key, "label": input_table.label, "pool_size": input_table.pool_size}
                for input_table in inputs
            ],
        },
        "provenance": provenance,
        "sections": [{"name": name, "encoding": encoding, "byte_length": len(data)} for name, encoding, data in sections],
    }

    header_bytes = json.dumps(header, separators=(",", ":")).encode("utf-8")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with (
        open(output_path, "wb") as raw_file,
        gzip.GzipFile(filename="", fileobj=raw_file, mode="wb", compresslevel=9, mtime=0) as file,
    ):
        file.write(MAGIC + struct.pack("<II", FORMAT_VERSION, len(header_bytes)) + header_bytes)
        for _, _, data in sections:
            file.write(data)
    return header
