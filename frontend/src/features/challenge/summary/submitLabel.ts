/* The submit button's words. The bidding mode stays in the label, so the last thing a challenger reads before
   clicking is how their price will be shown (CLAUDE.md, "The mode is shown ... in the challenge form before submission"). */
import type { BiddingModeValue } from '../types';

/** Return the label for the current state: submitting, awaiting re-confirmation, or "Submit sealed offer" style. */
export function submitLabel(acknowledgedMode: BiddingModeValue | null, isRevision: boolean, isSubmitting: boolean): string {
  if (isSubmitting) {
    return 'Submitting…';
  }
  if (acknowledgedMode === null) {
    // The confirm buttons sit above the form and in this card, so the label names no direction.
    return 'Confirm the new bidding terms to submit';
  }
  return `Submit ${acknowledgedMode} ${isRevision ? 'revision' : 'offer'}`;
}
