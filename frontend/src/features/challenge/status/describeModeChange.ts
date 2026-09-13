/* The one sentence that says what a changed bidding mode would do to an offer submitted now.
   Shared by the form's mode-change alert and the summary's warning, so the two can never describe the change differently. */
import type { BiddingModeValue } from '../types';

/** Return what submitting under newMode would reveal, and to whom. */
export function describeModeChange(newMode: BiddingModeValue): string {
  return newMode === 'open'
    ? 'An offer submitted now would show its price and scope to other bidders (never your identity).'
    : 'An offer submitted now would be sealed: only the business would see its price.';
}
