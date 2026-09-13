/* One whole-brain leaky integrate-and-fire network (Shiu et al. 2024), advanced one 0.1 ms step at a time.
   It owns neuron state and the synaptic delay line. It knows nothing about stimuli, workers or drawing. */
import type { Connectome } from '../../connectome/brainData';
import {
  CONDUCTANCE_DECAY,
  CONDUCTANCE_TO_MEMBRANE,
  MEMBRANE_DECAY,
  POISSON_EVENT_MV,
  QUIESCENT_EPSILON_MV,
  REFRACTORY_STEPS,
  SYNAPTIC_DELAY_STEPS,
  THRESHOLD_ABOVE_REST_MV,
  WEIGHT_PER_SYNAPSE_MV,
} from './lifParameters';
import { SpikeList } from './spikeList';

// Far enough in the past that no neuron starts out refractory.
const NEVER_SPIKED_STEP = -1_000_000_000;

export class LifNetwork {
  private readonly connectome: Connectome;
  // Both variables are stored relative to rest (mV); 0 means the neuron is exactly at rest.
  private readonly membrane: Float64Array;
  private readonly conductance: Float64Array;
  private readonly lastSpikeStep: Int32Array;
  private readonly refractorySteps: Uint8Array;
  // Only neurons that are away from rest are integrated; the rest are skipped until input arrives.
  private readonly isActive: Uint8Array;
  private readonly activeNeurons: Int32Array;
  private activeCount = 0;
  // Slot (s + delay) % length holds spikes emitted at step s, delivered when the clock reaches that slot.
  private readonly delayLine: SpikeList[];
  private readonly spikes: Int32Array;
  private spikeCount = 0;
  private currentStep = 0;

  /** Create a network at rest. noRefractoryNeurons are Poisson-stimulated neurons, which model.py gives rfc = 0. */
  public constructor(connectome: Connectome, noRefractoryNeurons: Iterable<number>) {
    const count = connectome.neuronCount;
    this.connectome = connectome;
    this.membrane = new Float64Array(count);
    this.conductance = new Float64Array(count);
    this.lastSpikeStep = new Int32Array(count).fill(NEVER_SPIKED_STEP);
    this.refractorySteps = new Uint8Array(count).fill(REFRACTORY_STEPS);
    for (const neuron of noRefractoryNeurons) {
      this.refractorySteps[neuron] = 0;
    }
    this.isActive = new Uint8Array(count);
    this.activeNeurons = new Int32Array(count);
    this.spikes = new Int32Array(count);
    this.delayLine = Array.from({ length: SYNAPTIC_DELAY_STEPS + 1 }, () => new SpikeList());
  }

  /** The step the next call to advance() will simulate. */
  public get step(): number {
    return this.currentStep;
  }

  /** How many neurons are currently away from rest (and so being integrated). */
  public get activeNeuronCount(): number {
    return this.activeCount;
  }

  /**
   * Advance one step and return the neurons that spiked in it (a view that the next call overwrites).
   * poissonTargets[0..poissonCount) receive a Poisson input event this step.
   *
   * The order mirrors Brian2's schedule for the published model: state update, threshold, synaptic delivery and
   * Poisson input, then reset. So input reaching a neuron in the step it spikes is wiped by its reset, as in Brian2.
   */
  public advance(poissonTargets: Int32Array, poissonCount: number): Int32Array {
    this.integrateAndThreshold();
    this.deliverDelayedSpikes();
    for (let index = 0; index < poissonCount; index += 1) {
      const neuron = poissonTargets[index];
      if (this.isRefractory(neuron)) {
        continue;
      }
      this.membrane[neuron] += POISSON_EVENT_MV;
      this.activate(neuron);
    }
    this.resetSpikingNeurons();
    this.currentStep += 1;
    return this.spikes.subarray(0, this.spikeCount);
  }

  /**
   * Return every neuron to rest and drop spikes still in transit, as if a new Brian2 trial started. The step count
   * carries on, so spike times stay on one timeline.
   */
  public resetToRest(): void {
    for (let index = 0; index < this.activeCount; index += 1) {
      const neuron = this.activeNeurons[index];
      this.membrane[neuron] = 0;
      this.conductance[neuron] = 0;
      this.isActive[neuron] = 0;
    }
    this.activeCount = 0;
    this.spikeCount = 0;
    this.lastSpikeStep.fill(NEVER_SPIKED_STEP);
    this.delayLine.forEach((slot) => slot.clear());
  }

  private integrateAndThreshold(): void {
    const step = this.currentStep;
    let kept = 0;
    this.spikeCount = 0;

    for (let index = 0; index < this.activeCount; index += 1) {
      const neuron = this.activeNeurons[index];
      let membrane = this.membrane[neuron];
      let conductance = this.conductance[neuron];
      // model.py's equations are "(unless refractory)": both variables hold still, and threshold is not checked.
      const isRefractory = this.isRefractory(neuron);
      let hasSpiked = false;

      if (!isRefractory) {
        membrane = membrane * MEMBRANE_DECAY + conductance * CONDUCTANCE_TO_MEMBRANE;
        conductance *= CONDUCTANCE_DECAY;
        this.membrane[neuron] = membrane;
        this.conductance[neuron] = conductance;
        if (membrane > THRESHOLD_ABOVE_REST_MV) {
          this.spikes[this.spikeCount] = neuron;
          this.spikeCount += 1;
          this.delayLine[(step + SYNAPTIC_DELAY_STEPS) % this.delayLine.length].push(neuron);
          // Recorded now, not at reset: Brian2's thresholder marks the neuron refractory before synapses run.
          this.lastSpikeStep[neuron] = step;
          hasSpiked = true;
        }
      }

      if (hasSpiked || Math.abs(membrane) >= QUIESCENT_EPSILON_MV || Math.abs(conductance) >= QUIESCENT_EPSILON_MV) {
        this.activeNeurons[kept] = neuron;
        kept += 1;
      } else {
        // Snap to exactly rest so a later input starts from the same state a never-touched neuron would.
        this.membrane[neuron] = 0;
        this.conductance[neuron] = 0;
        this.isActive[neuron] = 0;
      }
    }
    this.activeCount = kept;
  }

  private deliverDelayedSpikes(): void {
    const { rowOffsets, targets, synapseCounts, isInhibitory } = this.connectome;
    const arriving = this.delayLine[this.currentStep % this.delayLine.length];

    for (let index = 0; index < arriving.length; index += 1) {
      const source = arriving.values[index];
      const weightPerSynapse = isInhibitory[source] === 1 ? -WEIGHT_PER_SYNAPSE_MV : WEIGHT_PER_SYNAPSE_MV;
      for (let edge = rowOffsets[source]; edge < rowOffsets[source + 1]; edge += 1) {
        const target = targets[edge];
        // Brian2 makes "(unless refractory)" variables conditional writes: any write, synaptic input included, is
        // dropped while the target is refractory. Verified against Brian2 2.x with the published model.py network.
        if (this.isRefractory(target)) {
          continue;
        }
        this.conductance[target] += weightPerSynapse * synapseCounts[edge];
        this.activate(target);
      }
    }
    arriving.clear();
  }

  private resetSpikingNeurons(): void {
    for (let index = 0; index < this.spikeCount; index += 1) {
      const neuron = this.spikes[index];
      this.membrane[neuron] = 0;
      this.conductance[neuron] = 0;
    }
  }

  // A neuron that spiked this step counts as refractory even with no refractory period, as Brian2's thresholder
  // sets not_refractory = False for every spiking neuron; its reset would clear any input anyway.
  private isRefractory(neuron: number): boolean {
    const sinceSpike = this.currentStep - this.lastSpikeStep[neuron];
    return sinceSpike === 0 || sinceSpike < this.refractorySteps[neuron];
  }

  private activate(neuron: number): void {
    if (this.isActive[neuron] === 0) {
      this.isActive[neuron] = 1;
      this.activeNeurons[this.activeCount] = neuron;
      this.activeCount += 1;
    }
  }
}
