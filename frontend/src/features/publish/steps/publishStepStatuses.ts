/* Maps the publish hook's step to a status for each of the three visible steps: confirm, preview, publish.
   Display only; the hook alone decides what may happen next. */
import type { PublishStep } from '../usePublish';

export type StepStatus = 'complete' | 'current' | 'upcoming';

/** Return the status of steps 1, 2, and 3 for the hook's current step. */
export function publishStepStatuses(step: PublishStep): [StepStatus, StepStatus, StepStatus] {
  switch (step) {
    case 'editing':
      return ['current', 'upcoming', 'upcoming'];
    case 'drafting':
      return ['complete', 'current', 'upcoming'];
    // A fresh preview is on screen, so the only thing left is the owner's explicit publish click.
    case 'previewing':
    case 'publishing':
      return ['complete', 'complete', 'current'];
    case 'published':
      return ['complete', 'complete', 'complete'];
  }
}
