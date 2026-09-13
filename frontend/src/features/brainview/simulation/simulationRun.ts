/* Runs one stimulus through the whole-brain network in batches of steps and collects the spikes each batch produced.
   It has no clock and no thread of its own: the worker decides when to call advance(), so pacing stays in one place. */
import type { BrainStimulus } from '../../../shared/flybrain/live/brainStimulusTypes';
import type { Connectome } from '../connectome/brainData';
import { TIME_STEP_MS } from './model/lifParameters';
import { LifNetwork } from './model/lifNetwork';
import { createSeededRandom } from './seededRandom';
import { StimulusDrive } from './stimulusDrive';

/** The spikes of steps [fromStep, toStep): spikeNeurons[i] fired at spikeSteps[i]. */
export interface SpikeBatch {
  fromStep: number;
  toStep: number;
  spikeNeurons: Uint32Array;
  spikeSteps: Uint32Array;
  activeNeuronCount: number;
}

export class SimulationRun {
  public readonly totalSteps: number;
  public readonly drivenNeurons: Uint32Array;
  private readonly network: LifNetwork;
  private readonly drive: StimulusDrive;
  // Steps at which a new input slot begins and the brain is returned to rest (see the constructor).
  private readonly trialStartSteps: Set<number>;

  /** Prepare a run at rest. The seed fixes the Poisson input, so the same stimulus and seed replay identically. */
  public constructor(connectome: Connectome, stimulus: BrainStimulus, seed: number) {
    this.drive = new StimulusDrive(stimulus, connectome, createSeededRandom(seed));
    this.drivenNeurons = this.drive.drivenNeurons;
    this.network = new LifNetwork(connectome, this.drivenNeurons);
    this.totalSteps = Math.round(stimulus.duration_ms / TIME_STEP_MS);
    // In the published model, activity started by smell input keeps reverberating after the input stops (verified
    // against Brian2), so later inputs would land on a brain already busy with the first. Each slot of pulses that
    // start together is therefore its own trial from rest, like separate runs of the published model.
    this.trialStartSteps = new Set(
      stimulus.pulses.map((pulse) => Math.round(pulse.start_ms / TIME_STEP_MS)).filter((step) => step > 0),
    );
  }

  /** The next step to simulate; equal to totalSteps once the run is complete. */
  public get step(): number {
    return this.network.step;
  }

  public get isFinished(): boolean {
    return this.network.step >= this.totalSteps;
  }

  /** Simulate up to stepCount more steps (never past the end) and return their spikes. */
  public advance(stepCount: number): SpikeBatch {
    const fromStep = this.network.step;
    const toStep = Math.min(this.totalSteps, fromStep + stepCount);
    const neurons: number[] = [];
    const steps: number[] = [];

    for (let step = fromStep; step < toStep; step += 1) {
      if (this.trialStartSteps.has(step)) {
        this.network.resetToRest();
      }
      const { targets, count } = this.drive.eventsAt(step);
      const spikes = this.network.advance(targets, count);
      for (let index = 0; index < spikes.length; index += 1) {
        neurons.push(spikes[index]);
        steps.push(step);
      }
    }

    return {
      fromStep,
      toStep,
      spikeNeurons: Uint32Array.from(neurons),
      spikeSteps: Uint32Array.from(steps),
      activeNeuronCount: this.network.activeNeuronCount,
    };
  }
}
