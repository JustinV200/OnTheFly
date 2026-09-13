/* Sums a run's spikes per input trial (each slot of pulses that start together runs from rest), for the fruit fly's
   opinion. Pure bookkeeping over spike batches: it never says what the counts mean, and it never draws anything. */
import type { BrainStimulus } from '../../../../shared/flybrain/live/brainStimulusTypes';
import { TIME_STEP_MS } from '../model/lifParameters';
import type { SpikeBatch } from '../simulationRun';

// Spikes are also binned over brain time (10 ms bins, 100 steps at 0.1 ms), so a reader can look at the early
// response separately from the reverberation that follows it.
export const TRIAL_BIN_STEPS = 100;
export const TRIAL_BIN_MS = 10;

export interface TrialActivity {
  // Captions of the pulses that start this trial, in stimulus order without repeats ("What you pay now").
  captions: string[];
  startStep: number;
  endStep: number;
  spikeCount: number;
  // Distinct neurons that fired at least once during the trial.
  firedNeuronCount: number;
  // Spikes per TRIAL_BIN_STEPS-step bin from the trial's start; sums to spikeCount.
  spikesPerBin: number[];
}

export interface StimulusEvaluation {
  totalSteps: number;
  trials: TrialActivity[];
  computeMs: number;
}

/**
 * Split a run into trials at the same steps SimulationRun returns the brain to rest, each with zero counts so far.
 * Every trial is counted over the same window (the shortest gap between trial starts), because activity keeps
 * reverberating after an input stops: the last trial's longer tail would otherwise count for more.
 */
export function emptyTrials(stimulus: BrainStimulus, totalSteps: number): TrialActivity[] {
  const captionsByStart = new Map<number, string[]>();
  for (const pulse of stimulus.pulses) {
    // Same rounding as SimulationRun's trialStartSteps, so a trial here is exactly one trial there.
    const startStep = Math.round(pulse.start_ms / TIME_STEP_MS);
    const captions = captionsByStart.get(startStep) ?? [];
    if (!captions.includes(pulse.caption)) {
      captions.push(pulse.caption);
    }
    captionsByStart.set(startStep, captions);
  }
  const starts = [...captionsByStart.keys()].sort((left, right) => left - right);
  const gaps = starts.slice(1).map((start, index) => start - starts[index]);
  const windowSteps = gaps.length > 0 ? Math.min(...gaps) : totalSteps - (starts[0] ?? 0);
  return starts.map((startStep) => {
    const endStep = Math.min(totalSteps, startStep + windowSteps);
    return {
      captions: captionsByStart.get(startStep) ?? [],
      startStep,
      endStep,
      spikeCount: 0,
      firedNeuronCount: 0,
      spikesPerBin: new Array<number>(Math.ceil((endStep - startStep) / TRIAL_BIN_STEPS)).fill(0),
    };
  });
}

export class TrialCounter {
  private readonly trials: TrialActivity[];
  private readonly totalSteps: number;
  // One "has fired in the current trial" flag per neuron, cleared when the next trial starts.
  private readonly hasFired: Uint8Array;
  private trialIndex = 0;

  /** Prepare counters for every trial of stimulus; neuronCount sizes the fired-neuron bitmap. */
  public constructor(stimulus: BrainStimulus, totalSteps: number, neuronCount: number) {
    this.trials = emptyTrials(stimulus, totalSteps);
    this.totalSteps = totalSteps;
    this.hasFired = new Uint8Array(neuronCount);
  }

  /** Add a batch's spikes to their trials; batches must arrive in step order, as one SimulationRun produces them. */
  public append(batch: SpikeBatch): void {
    for (let index = 0; index < batch.spikeNeurons.length; index += 1) {
      const step = batch.spikeSteps[index];
      // Move to the trial that has started by this step; entering one clears the fired bitmap for it.
      while (this.trialIndex + 1 < this.trials.length && step >= this.trials[this.trialIndex + 1].startStep) {
        this.trialIndex += 1;
        this.hasFired.fill(0);
      }
      const trial = this.trials[this.trialIndex];
      // Spikes after a trial's counting window but before the next trial (the tail) belong to no trial.
      if (trial === undefined || step < trial.startStep || step >= trial.endStep) {
        continue;
      }
      const neuron = batch.spikeNeurons[index];
      trial.spikeCount += 1;
      trial.spikesPerBin[Math.floor((step - trial.startStep) / TRIAL_BIN_STEPS)] += 1;
      if (this.hasFired[neuron] === 0) {
        this.hasFired[neuron] = 1;
        trial.firedNeuronCount += 1;
      }
    }
  }

  /** The totals so far, with how long the simulation took. */
  public result(computeMs: number): StimulusEvaluation {
    return {
      totalSteps: this.totalSteps,
      trials: this.trials.map((trial) => ({ ...trial, captions: [...trial.captions], spikesPerBin: [...trial.spikesPerBin] })),
      computeMs,
    };
  }
}
