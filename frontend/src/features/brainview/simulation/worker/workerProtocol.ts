/* The messages the page and the simulation worker exchange. Typed arrays are transferred, never copied.
   The page never receives connectivity: only the layout to draw, the spikes to light up, and per-trial totals. */
import type { BrainStimulus } from '../../../../shared/flybrain/live/brainStimulusTypes';
import type { BrainLayout } from '../../connectome/brainData';
import type { StimulusEvaluation } from '../evaluation/trialActivity';
import type { SpikeBatch } from '../simulationRun';

export type PageToWorkerMessage =
  | { type: 'start'; runId: string; stimulus: BrainStimulus; seed: number }
  // How far playback has reached, so the worker only simulates a little ahead of what is on screen.
  | { type: 'playback'; runId: string; step: number }
  | { type: 'cancel'; runId: string }
  // Run a stimulus to the end at full speed and report only per-trial totals (the fruit fly's opinion). Evaluations
  // queue one behind another and interleave with a playing run; they never replace it.
  | { type: 'evaluate'; evaluationId: string; stimulus: BrainStimulus; seed: number };

export type WorkerToPageMessage =
  | { type: 'loading'; loadedBytes: number; totalBytes: number | null }
  | { type: 'ready'; layout: BrainLayout; decodeMs: number }
  | { type: 'started'; runId: string; totalSteps: number; drivenNeurons: Uint32Array }
  | { type: 'spikes'; runId: string; batch: SpikeBatch }
  | { type: 'finished'; runId: string; computeMs: number }
  | { type: 'evaluated'; evaluationId: string; evaluation: StimulusEvaluation }
  // runId is null when the brain data itself failed, which affects every run and evaluation; an evaluation that
  // couldn't start reports its evaluationId here.
  | { type: 'failed'; runId: string | null; message: string };
