/* The one-line status under the brain ("Brain time 240 of 1,300 ms · shown at 1/10 speed") and the input caption.
   Wording is shared by the compact dock and the expanded panel, so the two never describe a run differently. */
import type { PlaybackSpeed } from '../../playback/playbackClock';
import type { PlaybackStatus } from '../../playback/playbackStatus';

const SPEED_LABELS: Record<PlaybackSpeed, string> = {
  0.05: 'shown at 1/20 speed',
  0.1: 'shown at 1/10 speed',
  0.25: 'shown at 1/4 speed',
  1: 'shown in real time',
};

/** Describe where the run is: downloading, starting, playing, catching up, paused, finished, or failed. */
export function describeStatus(status: PlaybackStatus): string {
  const brainTime = `${status.brainTimeMs.toLocaleString()} of ${status.totalBrainTimeMs.toLocaleString()} ms`;
  switch (status.phase) {
    case 'loading':
      return status.loadPercent === null
        ? 'Downloading the brain wiring (first run of this visit only)…'
        : `Downloading the brain wiring: ${status.loadPercent}% (first run of this visit only)`;
    case 'starting':
      return 'Starting the simulation…';
    case 'playing':
      return `Brain time ${brainTime} · ${SPEED_LABELS[status.speed]}`;
    case 'catching-up':
      return `Brain time ${brainTime} · simulating the next moments…`;
    case 'paused':
      return `Paused at brain time ${brainTime}`;
    case 'finished':
      return `Finished: ${status.totalBrainTimeMs.toLocaleString()} ms of brain time`;
    case 'failed':
      return 'The simulation could not run.';
  }
}

/** Name the stimulus input active right now, or say that activity is just spreading between inputs. */
export function describeInput(status: PlaybackStatus): string | null {
  if (status.phase === 'loading' || status.phase === 'starting' || status.phase === 'failed') {
    return null;
  }
  return status.activeCaptions.length > 0 ? `Input now: ${status.activeCaptions.join(', ')}` : 'No input right now: activity is spreading';
}
