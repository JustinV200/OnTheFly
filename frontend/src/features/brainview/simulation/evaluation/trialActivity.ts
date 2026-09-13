/* Sums a run's spikes per input trial (each slot of pulses that start together runs from rest), for the fruit fly's
   opinion. Pure bookkeeping over spike batches: it never says what the counts mean, and it never draws anything. */
import type { BrainStimulus } from '../../../../shared/flybrain/live/brainStimulusTypes';
import { TIME_STEP_MS } from '../model/lifParameters';
import type { SpikeBatch } from '../simulationRun';

export interface TrialActivity {
  // Captions of the pulses that start this trial, in stimulus order without repeats ("What you pay now").
  captions: string[];
  startStep: number;
  endStep: number;
  spikeCount: number;
  // Distinct neurons that fired at least once during the trial.
  firedNeuronCount: number;
}

export interface StimulusEvaluation {
  totalSteps: number;
  trials: TrialActivity[];
  computeMs: number;
}

/** Split a run into trials at the same steps SimulationRun returns the brain to rest, each with zero counts so far. */
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
  return starts.map((startStep, index) => ({
    captions: captionsByStart.get(startStep) ?? [],
    startStep,
    endStep: index + 1 < starts.length ? starts[index + 1] : totalSteps,
    spikeCount: 0,
    firedNeuronCount: 0,
  }));
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
      // A spike lands in the trial whose window holds its step; moving on clears the bitmap for the next trial.
      while (this.trialIndex + 1 < this.trials.length && step >= this.trials[this.trialIndex].endStep) {
        this.trialIndex += 1;
        this.hasFired.fill(0);
      }
      const trial = this.trials[this.trialIndex];
      if (trial === undefined) {
        return;
      }
      const neuron = batch.spikeNeurons[index];
      trial.spikeCount += 1;
      if (this.hasFired[neuron] === 0) {
        this.hasFired[neuron] = 1;
        trial.firedNeuronCount += 1;
      }
    }
  }

  /** The totals so far, with how long the simulation took. */
  public result(computeMs: number): StimulusEvaluation {
    return { totalSteps: this.totalSteps, trials: this.trials.map((trial) => ({ ...trial, captions: [...trial.captions] })), computeMs };
  }
}
