/* Turns a brain_stimulus (receptor channels, strengths, timing) into Poisson input events on real sensory neurons.
   Each channel drives the neurons the brain file's input table assigns it, at up to model.py's 150 Hz. */
import type { BrainStimulus } from '../../../shared/flybrain/live/brainStimulusTypes';
import type { Connectome } from '../connectome/brainData';
import { MAX_POISSON_RATE_HZ, TIME_STEP_MS } from './model/lifParameters';

interface DriveSegment {
  startStep: number;
  endStep: number;
  neurons: Int32Array;
  // Per-step event probability for each neuron (rate * dt), the chance Brian2's PoissonInput(N=1) fires in a step.
  probabilities: Float64Array;
}

export class StimulusDrive {
  // Every neuron the stimulus ever drives; model.py gives Poisson targets no refractory period for the whole run.
  public readonly drivenNeurons: Uint32Array;
  private readonly segments: DriveSegment[];
  private readonly random: () => number;
  private readonly events: Int32Array;
  private segmentIndex = 0;
  private nextEventStep: Float64Array = new Float64Array(0);

  /** Build the drive; receptor channels outside the sense's table are ignored rather than wrapped. */
  public constructor(stimulus: BrainStimulus, connectome: Connectome, random: () => number) {
    this.random = random;
    this.segments = buildSegments(stimulus, connectome);
    const driven = new Set<number>();
    for (const segment of this.segments) {
      segment.neurons.forEach((neuron) => driven.add(neuron));
    }
    this.drivenNeurons = Uint32Array.from([...driven].sort((left, right) => left - right));
    this.events = new Int32Array(Math.max(1, this.drivenNeurons.length));
  }

  /** Write the neurons receiving an input event at this step into the returned buffer; return how many there are. */
  public eventsAt(step: number): { targets: Int32Array; count: number } {
    while (this.segmentIndex < this.segments.length && step >= this.segments[this.segmentIndex].endStep) {
      this.segmentIndex += 1;
      this.nextEventStep = new Float64Array(0);
    }
    const segment = this.segments[this.segmentIndex];
    if (segment === undefined || step < segment.startStep) {
      return { targets: this.events, count: 0 };
    }
    if (this.nextEventStep.length === 0) {
      // Entering a segment: the process is memoryless, so drawing fresh waiting times here is exact.
      this.nextEventStep = new Float64Array(segment.neurons.length);
      segment.probabilities.forEach((probability, index) => {
        this.nextEventStep[index] = step + this.waitingSteps(probability);
      });
    }

    let count = 0;
    for (let index = 0; index < segment.neurons.length; index += 1) {
      if (this.nextEventStep[index] === step) {
        this.events[count] = segment.neurons[index];
        count += 1;
        this.nextEventStep[index] = step + 1 + this.waitingSteps(segment.probabilities[index]);
      }
    }
    return { targets: this.events, count };
  }

  // Steps before the next success of a per-step Bernoulli trial: the same event times as drawing every step,
  // with one random number per event instead of one per neuron per step.
  private waitingSteps(probability: number): number {
    if (probability <= 0) {
      return Number.POSITIVE_INFINITY;
    }
    const uniform = 1 - this.random();
    return Math.floor(Math.log(uniform) / Math.log(1 - probability));
  }
}

function buildSegments(stimulus: BrainStimulus, connectome: Connectome): DriveSegment[] {
  const stepOf = (milliseconds: number): number => Math.round(milliseconds / TIME_STEP_MS);
  const boundaries = new Set<number>();
  for (const pulse of stimulus.pulses) {
    boundaries.add(stepOf(pulse.start_ms));
    boundaries.add(stepOf(pulse.start_ms + pulse.duration_ms));
  }
  const edges = [...boundaries].sort((left, right) => left - right);

  const segments: DriveSegment[] = [];
  for (let index = 0; index + 1 < edges.length; index += 1) {
    const [startStep, endStep] = [edges[index], edges[index + 1]];
    // Where channels overlap on a neuron the strongest drive wins, so no neuron exceeds model.py's 150 Hz.
    const rateByNeuron = new Map<number, number>();
    for (const pulse of stimulus.pulses) {
      if (stepOf(pulse.start_ms) > startStep || stepOf(pulse.start_ms + pulse.duration_ms) < endStep) {
        continue;
      }
      const table = connectome.inputNeurons.get(pulse.sense);
      if (table === undefined) {
        continue;
      }
      pulse.receptors.forEach((receptor, receptorIndex) => {
        const first = receptor * connectome.neuronsPerReceptor;
        if (first + connectome.neuronsPerReceptor > table.length) {
          return;
        }
        const rate = MAX_POISSON_RATE_HZ * pulse.strengths[receptorIndex];
        for (let offset = 0; offset < connectome.neuronsPerReceptor; offset += 1) {
          const neuron = table[first + offset];
          rateByNeuron.set(neuron, Math.max(rateByNeuron.get(neuron) ?? 0, rate));
        }
      });
    }
    if (rateByNeuron.size === 0) {
      continue;
    }
    const neurons = Int32Array.from(rateByNeuron.keys());
    const probabilities = Float64Array.from(neurons, (neuron) => ((rateByNeuron.get(neuron) ?? 0) * TIME_STEP_MS) / 1000);
    segments.push({ startStep, endStep, neurons, probabilities });
  }
  return segments;
}
