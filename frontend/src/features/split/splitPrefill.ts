/* The shape a Ways to save card hands the split drawer: its requirements and suggested cut, and the words to show. */
export interface SplitPrefill {
  savingsCardId: string;
  // True only for a potential_savings card: any other card informs a manual split and is never sent as a suggestion.
  isSuggestion: boolean;
  requirementKeys: string[];
  cutMinor: number;
  title: string;
  // The card's honesty label, e.g. "Modeled cut from demo market data — not an offer". Shown beside the Cut input, where
  // the modeled figure is, not as the drawer's description.
  label: string;
  // True when that label describes demo data, so it can carry the simulated tone the design system reserves for it.
  isLabelDemoData: boolean;
  // "Market rates put the same hours between $X and $Y (25th–75th percentile)." when the card had an interquartile
  // range; null otherwise. The honesty label is not repeated in it.
  cutRangeText: string | null;
}
