/* Validates the brain file's JSON header before anything trusts it (codingrules: validate at boundaries).
   Checks the fields the decoder, simulator and viewer read; unknown extra fields are ignored. */
import type { BrainHeader } from './brainData';

/** Return the header typed, or throw naming the first field that is missing or the wrong type. */
export function parseBrainHeader(raw: unknown): BrainHeader {
  const header = asRecord(raw, 'header');
  for (const field of ['format_version', 'neuron_count', 'edge_count', 'synapse_count', 'unplaced_neuron_count']) {
    requireNumber(header[field], field);
  }

  const position = asRecord(header.position, 'position');
  requireNumberList(position.centre_nm, 'position.centre_nm', 3);
  requireNumber(position.step_nm, 'position.step_nm');

  requireList(header.groups, 'groups').forEach((item, index) => {
    const group = asRecord(item, `groups[${index}]`);
    requireNumber(group.id, `groups[${index}].id`);
    requireNumber(group.count, `groups[${index}].count`);
    requireString(group.key, `groups[${index}].key`);
    requireString(group.label, `groups[${index}].label`);
    requireList(group.anchors, `groups[${index}].anchors`).forEach((anchor, anchorIndex) => {
      requireNumberList(asRecord(anchor, 'anchor').position_nm, `groups[${index}].anchors[${anchorIndex}]`, 3);
    });
  });

  const inputs = asRecord(header.inputs, 'inputs');
  requireNumber(inputs.receptor_count, 'inputs.receptor_count');
  requireNumber(inputs.neurons_per_receptor, 'inputs.neurons_per_receptor');
  requireList(inputs.senses, 'inputs.senses').forEach((item, index) => {
    const sense = asRecord(item, `inputs.senses[${index}]`);
    requireString(sense.key, `inputs.senses[${index}].key`);
    requireString(sense.label, `inputs.senses[${index}].label`);
    requireNumber(sense.pool_size, `inputs.senses[${index}].pool_size`);
  });

  const provenance = asRecord(header.provenance, 'provenance');
  for (const field of ['dataset', 'model', 'licence_note']) {
    requireString(provenance[field], `provenance.${field}`);
  }
  requireList(provenance.citations, 'provenance.citations').forEach((citation) => requireString(citation, 'citation'));

  requireList(header.sections, 'sections').forEach((item, index) => {
    const section = asRecord(item, `sections[${index}]`);
    requireString(section.name, `sections[${index}].name`);
    requireNumber(section.byte_length, `sections[${index}].byte_length`);
  });

  // Every field the rest of the app reads was checked above.
  return header as unknown as BrainHeader;
}

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalid(field);
  }
  return value as Record<string, unknown>;
}

function requireList(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw invalid(field);
  }
  return value;
}

function requireNumber(value: unknown, field: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw invalid(field);
  }
}

function requireString(value: unknown, field: string): void {
  if (typeof value !== 'string') {
    throw invalid(field);
  }
}

function requireNumberList(value: unknown, field: string, length: number): void {
  const list = requireList(value, field);
  if (list.length !== length) {
    throw invalid(field);
  }
  list.forEach((item) => requireNumber(item, field));
}

function invalid(field: string): Error {
  return new Error(`The brain data file's header is invalid (${field}).`);
}
