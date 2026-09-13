/* Polls the three chain businesses' own My work views and turns them into the demo script's progress. The demo guide and
   the presenter rail both read progress through this one hook; the rail is never mounted on the guide's page, so the
   three views are only ever polled once per tab. */
import type { ApiError } from '../../../shared/api/client';
import type { WorkResponse } from '../../tasks/types';
import { ChainStep, chainSteps } from './chainSteps';
import { ChainViews, GOVCON_ID, PRIME_A_ID, SUB_B_ID } from './chainTasks';
import { usePolledAs } from './usePolledAs';

// Short enough that a step turns done within a few seconds of the click that did it, on a projector.
const POLL_INTERVAL_MS = 4000;

export interface ChainProgress {
  views: ChainViews;
  steps: ChainStep[];
  doneCount: number;
  // The first step not yet done, or null once every step is done (or before progress has loaded).
  nextStep: ChainStep | null;
  nextStepNumber: number | null;
  // True once all three views have answered at least once; before that, "not done" only means "not known yet".
  isLoaded: boolean;
  isComplete: boolean;
  failure: ApiError | null;
  reload: () => void;
}

/** Return the chain's live progress, polled as each of the three businesses. */
export function useChainProgress(): ChainProgress {
  const govcon = usePolledAs<WorkResponse>('/api/work', GOVCON_ID, POLL_INTERVAL_MS);
  const prime = usePolledAs<WorkResponse>('/api/work', PRIME_A_ID, POLL_INTERVAL_MS);
  const sub = usePolledAs<WorkResponse>('/api/work', SUB_B_ID, POLL_INTERVAL_MS);

  const views: ChainViews = { govcon: govcon.data, prime: prime.data, sub: sub.data };
  const steps = chainSteps(views);
  const isLoaded = govcon.data !== null && prime.data !== null && sub.data !== null;
  const nextIndex = isLoaded ? steps.findIndex((step) => !step.isDone) : -1;

  return {
    views,
    steps,
    doneCount: steps.filter((step) => step.isDone).length,
    nextStep: nextIndex >= 0 ? steps[nextIndex] : null,
    nextStepNumber: nextIndex >= 0 ? nextIndex + 1 : null,
    isLoaded,
    isComplete: isLoaded && steps.every((step) => step.isDone),
    failure: govcon.error ?? prime.error ?? sub.error,
    reload: () => {
      govcon.reload();
      prime.reload();
      sub.reload();
    },
  };
}
