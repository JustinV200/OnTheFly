/* Stores one run's spikes as the worker delivers them and answers "which neurons fired between these two steps?".
   Also bins spikes by display group over brain time, for the activity chart. It never simulates anything. */
import type { SpikeBatch } from '../simulation/simulationRun';

// Activity is summarised in 10 ms bins of brain time (100 steps at 0.1 ms).
export const ACTIVITY_BIN_STEPS = 100;
const GROUP_SLOTS = 256;

export class RunTimeline {
  public readonly totalSteps: number;
  // Spikes per bin per display group: activity[group][bin].
  public readonly activity: Map<number, Uint32Array> = new Map();
  private readonly batches: SpikeBatch[] = [];
  private readonly displayGroups: Uint8Array;
  private computedThrough = 0;
  // Read cursor for sequential playback; reset when a range starts before it (a replay).
  private cursorBatch = 0;
  private cursorSpike = 0;
  private cursorStep = 0;

  /** Create an empty timeline for a run of totalSteps, grouping spikes by the layout's display groups. */
  public constructor(totalSteps: number, displayGroups: Uint8Array) {
    this.totalSteps = totalSteps;
    this.displayGroups = displayGroups;
  }

  /** The first step not yet computed; playback can't go past it. */
  public get computedStep(): number {
    return this.computedThrough;
  }

  /** Append a batch; batches arrive in step order from a single worker run. */
  public append(batch: SpikeBatch): void {
    this.batches.push(batch);
    this.computedThrough = batch.toStep;
    const binCount = Math.ceil(this.totalSteps / ACTIVITY_BIN_STEPS);
    for (let index = 0; index < batch.spikeNeurons.length; index += 1) {
      const group = this.displayGroups[batch.spikeNeurons[index]] % GROUP_SLOTS;
      let bins = this.activity.get(group);
      if (bins === undefined) {
        bins = new Uint32Array(binCount);
        this.activity.set(group, bins);
      }
      bins[Math.min(binCount - 1, Math.floor(batch.spikeSteps[index] / ACTIVITY_BIN_STEPS))] += 1;
    }
  }

  /**
   * Call visit for every spike with fromStep <= step < toStep, in step order. Ranges are expected to move forward;
   * a range that starts before the previous one rewinds to the beginning first.
   */
  public forEachSpike(fromStep: number, toStep: number, visit: (neuron: number) => void): void {
    if (fromStep < this.cursorStep) {
      this.cursorBatch = 0;
      this.cursorSpike = 0;
    }
    this.cursorStep = toStep;

    while (this.cursorBatch < this.batches.length) {
      const batch = this.batches[this.cursorBatch];
      while (this.cursorSpike < batch.spikeSteps.length) {
        const step = batch.spikeSteps[this.cursorSpike];
        if (step >= toStep) {
          return;
        }
        if (step >= fromStep) {
          visit(batch.spikeNeurons[this.cursorSpike]);
        }
        this.cursorSpike += 1;
      }
      this.cursorBatch += 1;
      this.cursorSpike = 0;
    }
  }
}
