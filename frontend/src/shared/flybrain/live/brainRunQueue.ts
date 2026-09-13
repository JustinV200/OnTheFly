/* The app-wide queue of fly-brain simulation runs. Features publish a response's brain_stimulus; the brain view plays them.
   Publishing is a quick synchronous bookkeeping step that never waits on the simulation, so no feature is slowed by it. */
import type { BrainStimulus } from './brainStimulusTypes';
import { brainStimulusKey } from './stimulusKey';

export interface QueuedBrainRun {
  id: string;
  // A stable fingerprint of the stimulus: the same input reaching the queue twice is recognised as one run.
  key: string;
  stimulus: BrainStimulus;
  // Set by the brain view once playback reaches the end; a finished run stays on screen until a new one replaces it.
  isFinished: boolean;
}

export interface BrainRunQueueSnapshot {
  current: QueuedBrainRun | null;
  waiting: QueuedBrainRun[];
}

// Runs beyond this many waiting are dropped oldest first: a burst of page loads shouldn't build a backlog to sit through.
const MAX_WAITING = 3;

const EMPTY: BrainRunQueueSnapshot = { current: null, waiting: [] };

let snapshot: BrainRunQueueSnapshot = EMPTY;
let runCounter = 0;
const listeners = new Set<() => void>();

/** Queue a run for a stimulus; null (no circuit ran) and a repeat of a current or waiting stimulus are ignored. */
export function publishBrainStimulus(stimulus: BrainStimulus | null | undefined): void {
  if (!stimulus || stimulus.pulses.length === 0) {
    return;
  }
  const key = brainStimulusKey(stimulus);
  if (snapshot.current?.key === key || snapshot.waiting.some((run) => run.key === key)) {
    return;
  }
  runCounter += 1;
  const run: QueuedBrainRun = { id: `brain-run-${runCounter}`, key, stimulus, isFinished: false };
  if (snapshot.current === null || snapshot.current.isFinished) {
    update({ current: run, waiting: snapshot.waiting });
  } else {
    update({ current: snapshot.current, waiting: [...snapshot.waiting, run].slice(-MAX_WAITING) });
  }
}

/** Mark a run's playback complete, and move straight on to the next waiting run if there is one. */
export function finishBrainRun(runId: string): void {
  const { current, waiting } = snapshot;
  if (current?.id !== runId) {
    return;
  }
  if (waiting.length > 0) {
    update({ current: waiting[0], waiting: waiting.slice(1) });
  } else if (!current.isFinished) {
    update({ current: { ...current, isFinished: true }, waiting });
  }
}

/** Drop every run, current and waiting (used when the viewer closes or the acting business changes). */
export function clearBrainRuns(): void {
  if (snapshot !== EMPTY) {
    update(EMPTY);
  }
}

/** Subscribe to queue changes; returns the unsubscribe function (the useSyncExternalStore contract). */
export function subscribeToBrainRuns(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The current queue state; a new object only when something changed. */
export function readBrainRuns(): BrainRunQueueSnapshot {
  return snapshot;
}

function update(next: BrainRunQueueSnapshot): void {
  snapshot = next;
  listeners.forEach((listener) => listener());
}
