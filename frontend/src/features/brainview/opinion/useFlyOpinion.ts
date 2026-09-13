/* Owns the state of one bubble: asks the worker for the stimulus's totals, derives the opinion, and reports the brain
   download while a first evaluation of the visit waits on it. Nothing here blocks a page: the bubble just updates. */
import { useEffect, useState } from 'react';

import { type BrainStimulus, brainStimulusKey } from '../../../shared/flybrain/live';
import { brainWorkerClient } from '../playback/brainWorkerClient';
import { evaluateBrainStimulus } from './evaluateStimulus';
import { deriveFlyOpinion, type FlyOpinion } from './flyOpinion';

export type FlyOpinionState =
  // No stimulus: the server had nothing to compare the offer against.
  | { status: 'none' }
  | { status: 'thinking'; loadPercent: number | null }
  | { status: 'failed'; message: string }
  // opinion is null when the simulation ran but nothing fired in either trial.
  | { status: 'ready'; opinion: FlyOpinion | null };

/** Evaluate stimulus (skipped when null) and expose the result; retry() starts the same evaluation over. */
export function useFlyOpinion(stimulus: BrainStimulus | null): { state: FlyOpinionState; retry: () => void } {
  const [state, setState] = useState<FlyOpinionState>(stimulus ? { status: 'thinking', loadPercent: null } : { status: 'none' });
  const [attempt, setAttempt] = useState(0);
  // The fingerprint, not the object: polling delivers a new object with the same content every few seconds.
  const key = stimulus ? brainStimulusKey(stimulus) : null;

  useEffect(() => {
    if (stimulus === null) {
      setState({ status: 'none' });
      return undefined;
    }
    let isCancelled = false;
    setState({ status: 'thinking', loadPercent: null });
    // Download progress only matters while thinking; the worker sends it just on the first load of the visit.
    const unsubscribe = brainWorkerClient().subscribe((message) => {
      if (message.type === 'loading' && !isCancelled) {
        const percent = message.totalBytes ? Math.min(100, Math.floor((100 * message.loadedBytes) / message.totalBytes)) : null;
        setState({ status: 'thinking', loadPercent: percent });
      }
    });
    evaluateBrainStimulus(stimulus).then(
      (evaluation) => {
        if (!isCancelled) {
          setState({ status: 'ready', opinion: deriveFlyOpinion(evaluation) });
        }
      },
      (error: unknown) => {
        if (!isCancelled) {
          setState({ status: 'failed', message: error instanceof Error ? error.message : String(error) });
        }
      },
    );
    return () => {
      isCancelled = true;
      unsubscribe();
    };
    // Re-run for a different stimulus (by content) or an explicit retry, never for a polled copy of the same one.
  }, [key, attempt]);

  return { state, retry: () => setAttempt((count) => count + 1) };
}
