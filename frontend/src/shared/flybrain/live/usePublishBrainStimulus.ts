/* Publishes a loaded response's brain_stimulus for pages that fetch through useApiQuery rather than their own hook.
   The queue ignores a stimulus it already holds, so reloads and polls don't replay the same run. */
import { useEffect } from 'react';

import type { BrainStimulus } from './brainStimulusTypes';
import { publishBrainStimulus } from './brainRunQueue';

/** Queue a run whenever a new stimulus object arrives; null or undefined (nothing loaded, no circuit ran) does nothing. */
export function usePublishBrainStimulus(stimulus: BrainStimulus | null | undefined): void {
  useEffect(() => {
    publishBrainStimulus(stimulus);
  }, [stimulus]);
}
