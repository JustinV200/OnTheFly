/* Plain-language meanings of the money words on Ways to save and the task money views, shown through TermHint so every
   screen explains "keep cost" or "remainder" the same way. Words only: nothing here computes a figure. It lives in the
   savings feature because the task page already depends on it; the task money views import it from here. */

export type MoneyTerm = 'keepCost' | 'suggestedCut' | 'potentialSavings' | 'oversight' | 'remainder' | 'committed' | 'potentialMargin' | 'provisional';

export const MONEY_TERM_HINTS: Record<MoneyTerm, string> = {
  keepCost: 'What this work costs you to do yourself, at your own rates.',
  suggestedCut: 'What this piece would be listed at: the same hours × the median public rate.',
  potentialSavings: 'What you would keep if the piece’s winner bids at the modeled cut. Potential until an offer is accepted.',
  oversight: 'Your own cost to manage the piece once someone else does it.',
  remainder: 'What’s left of your price after the cuts you’ve given pieces. Once a piece accepts an offer, its accepted price counts instead of its cut.',
  committed: 'What your pieces take out of your price: each piece’s accepted price, or its cut until it accepts an offer.',
  potentialMargin: 'Your remainder minus the keep cost of the work you still do yourself. Potential until the work actually changes hands.',
  provisional: 'Not final: an input is still unset or estimated (your oversight cost, or draft hours), so this figure can move.',
};
