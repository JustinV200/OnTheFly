/* The messages the page and the simulation worker exchange. Typed arrays are transferred, never copied.
   The page never receives connectivity: only the layout to draw and the spikes to light up. */
import type { BrainStimulus } from '../../../../shared/flybrain/live/brainStimulusTypes';
import type { BrainLayout } from '../../connectome/brainData';
import type { SpikeBatch } from '../simulationRun';

export type PageToWorkerMessage =
  | { type: 'start'; runId: string; stimulus: BrainStimulus; seed: number }
  // How far playback has reached, so the worker only simulates a little ahead of what is on screen.
  | { type: 'playback'; runId: string; step: number }
  | { type: 'cancel'; runId: string };

export type WorkerToPageMessage =
  | { type: 'loading'; loadedBytes: number; totalBytes: number | null }
  | { type: 'ready'; layout: BrainLayout; decodeMs: number }
  | { type: 'started'; runId: string; totalSteps: number; drivenNeurons: Uint32Array }
  | { type: 'spikes'; runId: string; batch: SpikeBatch }
  | { type: 'finished'; runId: string; computeMs: number }
  // runId is null when the brain data itself failed, which affects every run.
  | { type: 'failed'; runId: string | null; message: string };
