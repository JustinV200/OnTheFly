/* Fetches dashboard expenses and the selected expense's details for the owner view.
   Data loading stays here so presentational components stay focused on rendering. */
import { useState } from 'react';

import { ApiQueryState, useApiQuery } from '../../shared/api/useApiQuery';
import type { ExpenseDetail, ExpenseListResponse } from './types';

interface UseDashboardResult {
  list: ApiQueryState<ExpenseListResponse>;
  detail: ApiQueryState<ExpenseDetail>;
  selectedExpenseId: string | null;
  // Null clears the selection, e.g. after a vendor-alias merge deletes the selected row.
  selectExpense: (expenseId: string | null) => void;
  reload: () => void;
}

/** Load dashboard expenses, the selected expense's transactions, and a reload for after changes. */
export function useDashboard(): UseDashboardResult {
  const list = useApiQuery<ExpenseListResponse>('/api/expenses');
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const detail = useApiQuery<ExpenseDetail>(selectedExpenseId ? `/api/expenses/${selectedExpenseId}` : null);

  const reload = (): void => {
    list.reload();
    detail.reload();
  };

  return { list, detail, selectedExpenseId, selectExpense: setSelectedExpenseId, reload };
}
