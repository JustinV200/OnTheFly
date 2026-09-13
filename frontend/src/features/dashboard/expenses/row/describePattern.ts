/* Turns an expense's cadence, payment count, and recurrence confidence into plain words for the Pattern column:
   "Regular" + "Monthly · 12 payments". The raw confidence is kept for a tooltip, never shown as the label
   (roadmap 11, step 9 jargon swaps). Display only; the backend (services/expenses/recurrence.py) owns the score. */
import type { Expense } from '../../types';

export type Rhythm = 'Regular' | 'Irregular' | 'One-off';

export interface PatternDescription {
  rhythm: Rhythm;
  // Cadence and payment count, e.g. "Monthly · 12 payments" or "1 payment".
  detail: string;
  // The confidence percentage and what it measures, for a title attribute.
  tooltip: string;
}

// The backend's confidence averages how evenly payments are spaced and how steady their amounts are. At 0.8 or above,
// dates drift by a few days at most and amounts barely move, which is what an owner means by "regular". The fixtures'
// clean monthly and bimonthly series score about 0.93–0.95; a series with a price change or skipped month falls below.
const REGULAR_MIN_CONFIDENCE = 0.8;

// Plain words for the cadences the backend classifies. "bimonthly" there means every two months, not twice a month.
const CADENCE_WORDS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  bimonthly: 'Every 2 months',
  quarterly: 'Quarterly',
};

/** Describe one expense's payment pattern. A single payment is always "One-off", whatever its score. */
export function describePattern(expense: Pick<Expense, 'cadence' | 'period_count' | 'recurrence_confidence'>): PatternDescription {
  const percent = Math.round(expense.recurrence_confidence * 100);
  const payments = `${expense.period_count} ${expense.period_count === 1 ? 'payment' : 'payments'}`;
  const cadence = CADENCE_WORDS[expense.cadence];
  const rhythm: Rhythm = expense.period_count <= 1
    ? 'One-off'
    : expense.recurrence_confidence >= REGULAR_MIN_CONFIDENCE ? 'Regular' : 'Irregular';

  return {
    rhythm,
    // "irregular" and "insufficient_data" have no cadence word; the payment count alone is the honest detail.
    detail: cadence ? `${cadence} · ${payments}` : payments,
    tooltip: `Recurrence confidence ${percent}%: how evenly spaced and steady in amount these payments are.`,
  };
}
