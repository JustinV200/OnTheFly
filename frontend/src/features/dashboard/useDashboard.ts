/* Fetches dashboard expenses and selected expense details for the owner view.
   Data loading stays here so presentational components stay focused on rendering. */
import { useEffect, useState } from 'react';

import { get } from '../../shared/api/client';
import type { Expense, ExpenseDetail, ExpenseListResponse } from './types';

interface UseDashboardResult {
  expenses: Expense[];
  isLoading: boolean;
  message: string | null;
  selectedExpense: ExpenseDetail | null;
  selectExpense: (expenseId: string) => Promise<void>;
  reload: () => void;
}

/** Load dashboard expenses and provide selection helpers for detail requests. */
export function useDashboard(): UseDashboardResult {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revision, setRevision] = useState(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseDetail | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await get<ExpenseListResponse>('/api/expenses');
        setExpenses(response.expenses);
        setMessage(response.message ?? null);
      } catch {
        // A visible failure is more useful than leaving the dashboard in a permanent loading state.
        setMessage('Could not reach the backend at http://127.0.0.1:8000.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [revision]);

  const selectExpense = async (expenseId: string): Promise<void> => {
    const response = await get<ExpenseDetail>(`/api/expenses/${expenseId}`);
    setSelectedExpense(response);
  };

  return { expenses, isLoading, message, selectedExpense, selectExpense,
    reload: () => { setSelectedExpense(null); setRevision((value) => value + 1); } };
}
