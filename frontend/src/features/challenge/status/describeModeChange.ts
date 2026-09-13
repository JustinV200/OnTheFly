/* The one sentence that says what a changed bidding mode would do to an offer submitted now.
   Shared by the page's mode-change alert and the form's terms note, so the two can never describe the change differently. */
import type { BiddingModeValue } from '../types';

/** Return what submitting under newMode would reveal, and to whom. */
export function describeModeChange(newMode: BiddingModeValue): string {
  return newMode === 'open'
    ? 'An offer submitted now would show its price and scope to other challengers (never your identity).'
    : 'An offer submitted now would be sealed: only the owner would see its price.';
}
