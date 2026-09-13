/* Derives what the brain view says about a run (loading, playing, catching up, finished) from the session's raw facts.
   One pure function, so every label comes from the same state and none can contradict another. */
import type { QueuedBrainRun } from '../../../shared/flybrain/live';
import type { BrainLayout } from '../connectome/brainData';
import { TIME_STEP_MS } from '../simulation/model/lifParameters';
import type { PlaybackClock, PlaybackSpeed } from './playbackClock';

export type PlaybackPhase = 'loading' | 'failed' | 'starting' | 'playing' | 'catching-up' | 'paused' | 'finished';

export interface SessionFacts {
  run: QueuedBrainRun;
  layout: BrainLayout | null;
  loadFailure: string | null;
  loading: { loadedBytes: number; totalBytes: number | null } | null;
  totalSteps: number | null;
  computedStep: number;
  isComputed: boolean;
  firedNeuronCount: number;
  drivenNeurons: Uint32Array | null;
}

export interface PlaybackStatus {
  phase: PlaybackPhase;
  failure: string | null;
  // Whole percent of the brain file downloaded, or null when the size isn't known.
  loadPercent: number | null;
  brainTimeMs: number;
  totalBrainTimeMs: number;
  speed: PlaybackSpeed;
  firedNeuronCount: number;
  // Captions of the stimulus pulses active at the playback position ("Charge 3 of 8").
  activeCaptions: string[];
}

/** Summarise the facts and clock into the status the view renders. */
export function derivePlaybackStatus(facts: SessionFacts, clock: PlaybackClock): PlaybackStatus {
  const brainTimeMs = Math.round(clock.step * TIME_STEP_MS);
  const totalBrainTimeMs = facts.totalSteps === null ? facts.run.stimulus.duration_ms : Math.round(facts.totalSteps * TIME_STEP_MS);
  const { loading } = facts;
  const loadPercent = loading?.totalBytes ? Math.min(100, Math.floor((100 * loading.loadedBytes) / loading.totalBytes)) : null;

  return {
    phase: phaseOf(facts, clock),
    failure: facts.loadFailure,
    loadPercent,
    brainTimeMs,
    totalBrainTimeMs,
    speed: clock.speed,
    firedNeuronCount: facts.firedNeuronCount,
    activeCaptions: facts.run.stimulus.pulses
      .filter((pulse) => brainTimeMs >= pulse.start_ms && brainTimeMs < pulse.start_ms + pulse.duration_ms)
      .map((pulse) => pulse.caption)
      .filter((caption, index, captions) => captions.indexOf(caption) === index),
  };
}

function phaseOf(facts: SessionFacts, clock: PlaybackClock): PlaybackPhase {
  if (facts.loadFailure !== null) {
    return 'failed';
  }
  if (facts.layout === null) {
    return 'loading';
  }
  if (facts.totalSteps === null) {
    return 'starting';
  }
  if (clock.step >= facts.totalSteps) {
    return 'finished';
  }
  if (clock.isPaused) {
    return 'paused';
  }
  // Playback has reached the edge of what's computed: the simulation is slower than the chosen speed right now.
  return !facts.isComputed && clock.step >= facts.computedStep - 1 ? 'catching-up' : 'playing';
}
