/* Orders the owner's expenses for the Spend list: largest annual cost first, so the natural rebid candidate leads,
   with expenses that can't be published (payroll, taxes, transfers, owner-marked) split into their own group.
   Ordering only: no amount is added, converted, or changed here. */
import type { Expense } from '../types';

export interface ArrangedExpenses {
  publishable: Expense[];
  notPublishable: Expense[];
}

/** Split expenses by is_publishable and sort each group by annual cost, highest first. */
export function arrangeExpenses(expenses: Expense[]): ArrangedExpenses {
  const sorted = [...expenses].sort(compareExpenses);
  return {
    publishable: sorted.filter((expense) => expense.is_publishable),
    notPublishable: sorted.filter((expense) => !expense.is_publishable),
  };
}

function compareExpenses(first: Expense, second: Expense): number {
  // Amounts in different currencies are never compared: rows group by currency code first, then by amount.
  if (first.currency !== second.currency) {
    return first.currency.localeCompare(second.currency);
  }
  if (first.annualized_amount_minor !== second.annualized_amount_minor) {
    return second.annualized_amount_minor - first.annualized_amount_minor;
  }
  return first.vendor.localeCompare(second.vendor);
}
