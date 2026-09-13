"""Builds frontend/public/flybrain/fly-brain-783.bin.gz from FlyWire release 783 and Shiu et al.'s model inputs.
Run: python build_brain_data.py --cache-dir <download folder>. See README.md for sources, licences and the file layout.
"""

import argparse
from pathlib import Path

import numpy as np

from brain_file_writer import write_brain_file
from connectome_encoding import encode_connectome
from input_tables import olfactory_table, visual_table
from neuron_table import build_neuron_table
from sources import ANNOTATIONS, COMPLETENESS, CONNECTIVITY, fetch_sources

DEFAULT_OUTPUT = Path(__file__).resolve().parents[2] / "public" / "flybrain" / "fly-brain-783.bin.gz"

# Shown in the viewer's "what you're seeing" note, so the picture always names where its data came from.
PROVENANCE: dict[str, object] = {
    "dataset": "FlyWire adult Drosophila brain connectome, release 783",
    # Lower case: the viewer places both strings mid-sentence.
    "model": "leaky integrate-and-fire model of Shiu et al. (2024)",
    "citations": [
        "Dorkenwald et al. (2024), Neuronal wiring diagram of an adult brain, Nature",
        "Schlegel et al. (2024), Whole-brain annotation and multi-connectome cell typing of Drosophila, Nature",
        "Shiu et al. (2024), A Drosophila computational brain model reveals sensorimotor processing, Nature",
    ],
    "licence_note": "FlyWire connectome data: CC BY 4.0. Model code: MIT. See frontend/scripts/flybrain-data/README.md.",
    "sources": [CONNECTIVITY.url, COMPLETENESS.url, ANNOTATIONS.url],
}


def main() -> None:
    """Download sources if needed, build every section, write the file and print a summary."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache-dir", type=Path, required=True, help="Where source downloads are cached")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--neuron-order-out",
        type=Path,
        help="Optionally save the stored order as FlyWire root ids (.npy), for validating the simulator",
    )
    arguments = parser.parse_args()

    paths = fetch_sources(arguments.cache_dir)
    table = build_neuron_table(paths[COMPLETENESS.cache_name], paths[ANNOTATIONS.cache_name])
    connectome = encode_connectome(paths[CONNECTIVITY.cache_name], table)
    inputs = [olfactory_table(table), visual_table(table)]
    header = write_brain_file(arguments.output, table, connectome, inputs, PROVENANCE)
    if arguments.neuron_order_out:
        np.save(arguments.neuron_order_out, table.root_ids)

    size_mb = arguments.output.stat().st_size / 1_000_000
    print(
        f"Wrote {arguments.output} ({size_mb:.1f} MB): {header['neuron_count']:,} neurons, "
        f"{header['edge_count']:,} connections, {header['synapse_count']:,} synapses, "
        f"{header['unplaced_neuron_count']} without a position"
    )


if __name__ == "__main__":
    main()
