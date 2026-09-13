/* Words for a card's tier: a short badge on the card and the phrase used when groups are counted ("2 specialist market
   (no modeled savings)"). "Didn't qualify" rather than "below thresholds", because a not_viable card can also be one
   whose rates or hours couldn't be checked (viability.py). Unknown tiers are shown as stored. */
import type { SavingsTier } from '../types';

interface TierWords {
  badge: string;
  counted: string;
}

const WORDS: Record<SavingsTier, TierWords> = {
  potential_savings: { badge: 'Suggested piece', counted: 'suggested' },
  specialist_market: { badge: 'Specialist market', counted: 'specialist market (no modeled savings)' },
  needs_rates: { badge: 'Needs your rate', counted: 'need your rates' },
  not_viable: { badge: 'Didn’t qualify', counted: 'didn’t qualify on these numbers' },
};

/** Return the badge and counted phrase for a tier. */
export function tierWords(tier: string): TierWords {
  return WORDS[tier as SavingsTier] ?? { badge: tier.replace(/_/g, ' '), counted: tier.replace(/_/g, ' ') };
}
