/* Owns the PlaybackSession for the run on screen: one session per run, disposed when the run changes or the view closes.
   Also moves the queue on once a finished run has been on screen long enough to read its last frame. */
import { useEffect, useState, useSyncExternalStore } from 'react';

import { finishBrainRun, type QueuedBrainRun } from '../../../shared/flybrain/live';
import { brainWorkerClient } from '../playback/brainWorkerClient';
import type { PlaybackSpeed } from '../playback/playbackClock';
import { PlaybackSession } from '../playback/playbackSession';
import type { PlaybackStatus } from '../playback/playbackStatus';

// A finished run stays up this long before a waiting run replaces it.
const FINISHED_HOLD_MS = 2500;

interface BrainSessionState {
  session: PlaybackSession;
  status: PlaybackStatus;
  // Start a fresh attempt at the same run (after the brain data failed to load).
  retry: () => void;
}

/** Create and run a session for run; speed and pause preferences carry over from one run to the next. */
export function useBrainSession(run: QueuedBrainRun, speed: PlaybackSpeed, shouldStartPaused: boolean): BrainSessionState {
  const [attempt, setAttempt] = useState(0);
  const [session, setSession] = useState(() => new PlaybackSession(brainWorkerClient(), run));

  useEffect(() => {
    const next = new PlaybackSession(brainWorkerClient(), run);
    next.clock.speed = speed;
    next.clock.isPaused = shouldStartPaused;
    setSession(next);
    next.start();
    return () => next.dispose();
    // A new session only for a different run or a retry: speed changes go to the live session below, and the
    // start-paused preference only applies to how a new run begins.
  }, [run.id, attempt]);

  useEffect(() => {
    session.setSpeed(speed);
  }, [session, speed]);

  const status = useSyncExternalStore(
    (listener) => session.subscribeStatus(listener),
    () => session.getStatus(),
  );

  useEffect(() => {
    if (status.phase !== 'finished') {
      return undefined;
    }
    const timer = window.setTimeout(() => finishBrainRun(run.id), FINISHED_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [status.phase, run.id]);

  return { session, status, retry: () => setAttempt((count) => count + 1) };
}
