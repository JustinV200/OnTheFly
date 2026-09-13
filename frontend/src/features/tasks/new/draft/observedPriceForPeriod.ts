/* Picks the expense's observed spend for a REBID's billing period, to start "What you pay now" from evidence instead of a
   blank. It never converts between periods: the backend's annualized figure serves a yearly task, the per-period amount
   serves a task billed on the expense's own cadence, and any other period gets nothing (the owner types it). */
import type { ExpenseDetail } from '../../../dashboard/types';

const ANNUAL_PERIODS = new Set(['annual', 'annually', 'yearly']);

/** Return the observed amount in minor units for the billing period, or null when the expense has none for it. */
export function observedPriceForPeriod(expense: ExpenseDetail, billingPeriod: string): number | null {
  if (ANNUAL_PERIODS.has(billingPeriod)) {
    return expense.annualized_amount_minor;
  }
  return expense.cadence === billingPeriod ? expense.amount_minor_per_period : null;
}
