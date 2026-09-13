/* The fingerprint of a brain stimulus. The run queue uses it to recognise a repeat, and the opinion evaluator uses it
   both as its cache key and to seed the simulation, so an opinion and a later replay of the same stimulus spike alike. */
import type { BrainStimulus } from './brainStimulusTypes';

/** Return a stable string for a stimulus; equal stimuli (field by field) give equal keys. */
export function brainStimulusKey(stimulus: BrainStimulus): string {
  return JSON.stringify(stimulus);
}
