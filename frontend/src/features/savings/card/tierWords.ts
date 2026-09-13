/* Words for a card's tier: a short badge on the card and the phrase used when groups are counted ("2 have no modeled
   savings (specialist market)"). "Didn't clear the thresholds" rather than "below thresholds", because a not_viable card
   can also be one whose rates or hours couldn't be checked (viability.py). Unknown tiers are shown as stored. */
import type { SavingsTier } from '../types';

interface TierWords {
  badge: string;
  // The phrase after a count of two or more, e.g. "2 " + counted.
  counted: string;
  // The same phrase after a count of one, where the verb has to agree.
  countedOne: string;
}

const WORDS: Record<SavingsTier, TierWords> = {
  potential_savings: { badge: 'Suggested piece', counted: 'suggested', countedOne: 'suggested' },
  specialist_market: {
    badge: 'Specialist market',
    counted: 'have no modeled savings (specialist market)',
    countedOne: 'has no modeled savings (specialist market)',
  },
  needs_rates: { badge: 'Needs your rate', counted: 'need your rates', countedOne: 'needs your rate' },
  not_viable: { badge: 'Didn’t qualify', counted: 'didn’t clear the thresholds', countedOne: 'didn’t clear the thresholds' },
};

/** Return the badge and counted phrases for a tier. */
export function tierWords(tier: string): TierWords {
  const fallback = tier.replace(/_/g, ' ');
  return WORDS[tier as SavingsTier] ?? { badge: fallback, counted: fallback, countedOne: fallback };
}
