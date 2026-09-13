/* Decodes the brain file (after decompression) into the simulator's Connectome and the renderer's BrainLayout.
   The layout is written by frontend/scripts/flybrain-data/brain_file_writer.py; the two must change together. */
import type { BrainHeader, BrainLayout, Connectome } from './brainData';
import { parseBrainHeader } from './parseBrainHeader';
import { decodeVarints } from './varints';

const MAGIC = 'FLYB';
const SUPPORTED_FORMAT_VERSION = 1;
const PREAMBLE_BYTES = 12;

export interface DecodedBrain {
  connectome: Connectome;
  layout: BrainLayout;
}

/** Decode a whole brain file; throws with a readable reason when the bytes are not a supported brain file. */
export function decodeBrainFile(bytes: Uint8Array): DecodedBrain {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (magic !== MAGIC) {
    throw new Error('The brain data file is not in the expected format.');
  }
  const version = view.getUint32(4, true);
  if (version !== SUPPORTED_FORMAT_VERSION) {
    throw new Error(`The brain data file is format ${version}; this app reads format ${SUPPORTED_FORMAT_VERSION}.`);
  }
  const headerLength = view.getUint32(8, true);
  const header = parseBrainHeader(JSON.parse(new TextDecoder().decode(bytes.subarray(PREAMBLE_BYTES, PREAMBLE_BYTES + headerLength))));
  const sections = sliceSections(bytes, header, PREAMBLE_BYTES + headerLength);
  const neuronCount = header.neuron_count;

  const rowLengths = decodeVarints(sections.get('row_lengths'), neuronCount);
  const rowOffsets = new Uint32Array(neuronCount + 1);
  for (let neuron = 0; neuron < neuronCount; neuron += 1) {
    rowOffsets[neuron + 1] = rowOffsets[neuron] + rowLengths[neuron];
  }
  if (rowOffsets[neuronCount] !== header.edge_count) {
    throw new Error('The brain data file is damaged: connection counts do not add up.');
  }

  // Targets are stored as differences within each neuron's row; undo that row by row.
  const targets = decodeVarints(sections.get('target_deltas'), header.edge_count);
  for (let neuron = 0; neuron < neuronCount; neuron += 1) {
    for (let edge = rowOffsets[neuron] + 1; edge < rowOffsets[neuron + 1]; edge += 1) {
      targets[edge] += targets[edge - 1];
    }
  }
  const countsMinusOne = decodeVarints(sections.get('synapse_counts_minus_one'), header.edge_count);
  // A plain loop: a mapping from() over 15 million values is several times slower in current engines.
  const synapseCounts = new Uint16Array(header.edge_count);
  for (let edge = 0; edge < header.edge_count; edge += 1) {
    synapseCounts[edge] = countsMinusOne[edge] + 1;
  }

  const inputNeurons = new Map<string, Uint32Array>();
  for (const sense of header.inputs.senses) {
    inputNeurons.set(sense.key, new Uint32Array(copyAligned(sections.get(`inputs_${sense.key}`), 4)));
  }

  return {
    connectome: {
      neuronCount,
      rowOffsets,
      targets,
      synapseCounts,
      isInhibitory: sections.get('is_inhibitory').slice(),
      inputNeurons,
      neuronsPerReceptor: header.inputs.neurons_per_receptor,
    },
    layout: {
      header,
      positions: new Int16Array(copyAligned(sections.get('positions'), 2)),
      displayGroups: sections.get('display_groups').slice(),
    },
  };
}

interface SectionMap {
  get(name: string): Uint8Array;
}

function sliceSections(bytes: Uint8Array, header: BrainHeader, firstOffset: number): SectionMap {
  const byName = new Map<string, Uint8Array>();
  let offset = firstOffset;
  for (const section of header.sections) {
    byName.set(section.name, bytes.subarray(offset, offset + section.byte_length));
    offset += section.byte_length;
  }
  if (offset !== bytes.byteLength) {
    throw new Error('The brain data file is damaged: its length does not match its header.');
  }
  return {
    get(name: string): Uint8Array {
      const section = byName.get(name);
      if (section === undefined) {
        throw new Error(`The brain data file has no "${name}" section.`);
      }
      return section;
    },
  };
}

// Typed arrays wider than a byte must start on a multiple of their width, which a slice of the file rarely does.
function copyAligned(section: Uint8Array, bytesPerValue: number): ArrayBuffer {
  if (section.byteLength % bytesPerValue !== 0) {
    throw new Error('The brain data file is damaged: a section has a partial value.');
  }
  return section.slice().buffer;
}
