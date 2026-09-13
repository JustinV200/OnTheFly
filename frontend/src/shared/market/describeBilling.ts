/* Says how often a listing is billed, in words ("billed annually"). Words only; it never converts an amount. Unknown
   cadences are spelled out rather than guessed. */
const ADVERBS: Record<string, string> = {
  weekly: 'weekly',
  biweekly: 'every two weeks',
  monthly: 'monthly',
  bimonthly: 'every two months',
  quarterly: 'quarterly',
  annual: 'annually',
  annually: 'annually',
  yearly: 'annually',
};

/** Return "billed annually"-style words for a billing cadence. */
export function describeBilling(cadence: string): string {
  return `billed ${ADVERBS[cadence] ?? `per ${cadence} period`}`;
}
