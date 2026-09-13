/* The shape a Ways to save card hands the split drawer: its requirements and suggested cut, and the words to show. */
export interface SplitPrefill {
  savingsCardId: string;
  // True only for a potential_savings card: any other card informs a manual split and is never sent as a suggestion.
  isSuggestion: boolean;
  requirementKeys: string[];
  cutMinor: number;
  title: string;
  // The card's honesty label, e.g. "Modeled cut from demo market data — not an offer".
  label: string;
  // "Public rates put this between $X and $Y" when the card had an interquartile range.
  cutRangeText: string | null;
}
