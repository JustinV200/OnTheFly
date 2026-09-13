/* Declares the decoded brain file: the header's metadata and the typed arrays the simulator and renderer read.
   The simulator needs only Connectome; the renderer needs only BrainLayout, so the worker can keep the heavy part. */

export interface GroupAnchor {
  side: string;
  position_nm: [number, number, number];
}

export interface DisplayGroupInfo {
  id: number;
  key: string;
  label: string;
  count: number;
  anchors: GroupAnchor[];
}

export interface SenseInfo {
  key: string;
  label: string;
  pool_size: number;
}

export interface BrainProvenance {
  dataset: string;
  model: string;
  citations: string[];
  licence_note: string;
  sources: string[];
}

export interface BrainSection {
  name: string;
  encoding: string;
  byte_length: number;
}

export interface BrainHeader {
  format_version: number;
  neuron_count: number;
  edge_count: number;
  synapse_count: number;
  position: { centre_nm: [number, number, number]; step_nm: number };
  groups: DisplayGroupInfo[];
  unplaced_neuron_count: number;
  inputs: { receptor_count: number; neurons_per_receptor: number; senses: SenseInfo[] };
  provenance: BrainProvenance;
  sections: BrainSection[];
}

/** The wiring the simulator runs: outgoing connections per neuron in compressed-row form. */
export interface Connectome {
  neuronCount: number;
  // Connections of neuron i are targets[rowOffsets[i]] .. targets[rowOffsets[i + 1] - 1].
  rowOffsets: Uint32Array;
  targets: Uint32Array;
  synapseCounts: Uint16Array;
  // 1 when every synapse the neuron makes has a negative sign in the model.
  isInhibitory: Uint8Array;
  // For each sense key, receptor channel r stimulates neurons [r * perReceptor, (r + 1) * perReceptor).
  inputNeurons: Map<string, Uint32Array>;
  neuronsPerReceptor: number;
}

/** What the renderer draws: one quantised position and display group per neuron. */
export interface BrainLayout {
  header: BrainHeader;
  // x, y, z per neuron in units of header.position.step_nm, relative to header.position.centre_nm.
  positions: Int16Array;
  displayGroups: Uint8Array;
}

// Neurons in this group have no annotated position; they are simulated but never drawn.
export const UNPLACED_GROUP_ID = 255;
