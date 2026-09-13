/* Derives a run's random seed from its stimulus, so the same input always produces the same simulated spikes. */

/** Return a 32-bit FNV-1a hash of the stimulus fingerprint. */
export function stimulusSeed(stimulusKey: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < stimulusKey.length; index += 1) {
    hash ^= stimulusKey.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
