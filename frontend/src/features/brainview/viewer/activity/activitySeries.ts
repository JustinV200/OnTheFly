/* Turns the timeline's spike bins into per-cell-class firing-rate series, up to the playback position only.
   Rates are average spikes per second per neuron of the class, so a class of 50 and a class of 70,000 compare fairly. */
import type { BrainLayout } from '../../connectome/brainData';
import { ACTIVITY_BIN_STEPS, type RunTimeline } from '../../playback/runTimeline';
import { TIME_STEP_MS } from '../../simulation/model/lifParameters';

const BIN_SECONDS = (ACTIVITY_BIN_STEPS * TIME_STEP_MS) / 1000;

export interface ActivitySeries {
  groupId: number;
  label: string;
  neuronCount: number;
  // Average firing rate (Hz) per bin, for bins up to the playback position.
  rates: number[];
  peakRate: number;
  spikeCount: number;
}

/** Build one series per drawn cell class, in the file's pathway order; binCount is the whole run's bin count. */
export function buildActivitySeries(layout: BrainLayout, timeline: RunTimeline | null, playbackStep: number): { series: ActivitySeries[]; binCount: number } {
  const binCount = timeline === null ? 0 : Math.ceil(timeline.totalSteps / ACTIVITY_BIN_STEPS);
  const visibleBins = Math.min(binCount, Math.floor(playbackStep / ACTIVITY_BIN_STEPS));

  const series = layout.header.groups
    .filter((group) => group.count > 0)
    .map((group) => {
      const bins = timeline?.activity.get(group.id);
      const rates: number[] = [];
      let spikeCount = 0;
      for (let bin = 0; bin < visibleBins; bin += 1) {
        const count = bins?.[bin] ?? 0;
        spikeCount += count;
        rates.push(count / group.count / BIN_SECONDS);
      }
      return {
        groupId: group.id,
        label: group.label,
        neuronCount: group.count,
        rates,
        peakRate: rates.reduce((peak, rate) => Math.max(peak, rate), 0),
        spikeCount,
      };
    });
  return { series, binCount };
}

/** The brain time (ms) at the middle of a bin. */
export function binMidpointMs(bin: number): number {
  return (bin + 0.5) * BIN_SECONDS * 1000;
}
