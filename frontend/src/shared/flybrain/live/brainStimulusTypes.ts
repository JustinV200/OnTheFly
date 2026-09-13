/* Declares the brain_stimulus field fly-brain API responses carry: which receptor channels to drive, how hard, and when.
   Mirrors backend app/services/flybrain/brain_stimulus. It describes an input only; it never carries a result. */
import type { FlyBrainComponent } from '../types';

export type SensoryInput = 'olfactory' | 'visual';

export interface StimulusPulse {
  sense: SensoryInput;
  // Brain time from the start of the run, in milliseconds.
  start_ms: number;
  duration_ms: number;
  // Fixed generic words ("Charge 3 of 8"); the backend never puts names, amounts or descriptions here.
  caption: string;
  // Receptor channels in [0, receptor_count), ascending, with a strength in (0, 1] for each.
  receptors: number[];
  strengths: number[];
}

export interface BrainStimulus {
  // The result this run accompanies, in plain words ("Similar listings").
  result_label: string;
  // The circuits that produced that result; the simulation itself produces no result.
  circuits: FlyBrainComponent[];
  receptor_count: number;
  pulses: StimulusPulse[];
  duration_ms: number;
}
