/* Words after an expense's per-period amount, e.g. "$2,400.00 / month". Words only: the amount is the backend's
   and is never converted between periods here. For irregular spend the backend's per-period figure is the average
   charge (services/expenses/baseline.py), so it is labelled that way rather than as a period. */

const PERIOD_WORDS: Record<string, string> = {
  weekly: '/ week',
  biweekly: '/ 2 weeks',
  monthly: '/ month',
  bimonthly: '/ 2 months',
  quarterly: '/ quarter',
};

/** Return the label after a per-period amount; unknown cadences are named rather than guessed. */
export function perPeriodLabel(cadence: string, periodCount: number): string {
  if (PERIOD_WORDS[cadence]) {
    return PERIOD_WORDS[cadence];
  }
  if (cadence === 'irregular' || cadence === 'insufficient_data') {
    return periodCount === 1 ? 'per payment' : 'average per payment';
  }
  return `per ${cadence} period`;
}
