/* The one-line summary on the collapsed "other groups" disclosure, e.g. "3 other groups checked: 2 specialist market
   (no modeled savings), 1 didn't qualify on these numbers". Counts only; tiers are the server's. */
import { tierWords } from '../card/tierWords';
import type { SavingsCardView, SavingsTier } from '../types';

// The order groups are listed in, both in the summary and when expanded: closest to useful first.
export const OTHER_TIER_ORDER: SavingsTier[] = ['specialist_market', 'needs_rates', 'not_viable'];

/** Return the summary sentence; the word "other" is dropped when nothing on the task was suggested. */
export function otherGroupsSummary(cards: SavingsCardView[], hasSuggestions: boolean): string {
  const parts = OTHER_TIER_ORDER
    .map((tier) => ({ tier, count: cards.filter((card) => card.tier === tier).length }))
    .filter((entry) => entry.count > 0)
    .map((entry) => `${entry.count} ${tierWords(entry.tier).counted}`);
  const noun = cards.length === 1 ? 'group' : 'groups';
  return `${cards.length} ${hasSuggestions ? 'other ' : ''}${noun} checked${parts.length > 0 ? `: ${parts.join(', ')}` : ''}`;
}
