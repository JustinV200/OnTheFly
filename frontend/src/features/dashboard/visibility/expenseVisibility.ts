/* The state Spend shows for an expense's listing. The expense's own visibility stays "public" after its REBID task accepts
   an offer, but the listing is off the markets by then, so an accepted task reads "accepted" rather than "Public".
   Anything else passes through unchanged, and VisibilityBadge still treats unknown values as private. */
import type { Expense } from '../types';

/** Return "accepted" for an expense whose REBID task accepted an offer, otherwise the expense's visibility. */
export function expenseVisibility(expense: Expense): string {
  return expense.task_state === 'accepted' ? 'accepted' : expense.visibility;
}
