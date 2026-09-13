/* Names a billing period in plain words for running text ("2,080 h per year", "In US dollars, per year"), instead of
   raw stored values like "per annual period". Words only; it never converts an amount or an hour count between periods. */
const PHRASES: Record<string, string> = {
  weekly: 'per week',
  biweekly: 'every two weeks',
  monthly: 'per month',
  bimonthly: 'every two months',
  quarterly: 'per quarter',
  annual: 'per year',
  annually: 'per year',
  yearly: 'per year',
};

/** Return "per year"-style words for a billing cadence; an unknown cadence is spelled out rather than guessed. */
export function perPeriodWords(cadence: string): string {
  return PHRASES[cadence] ?? `per ${cadence} period`;
}
