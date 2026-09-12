/* Fetches dashboard expenses and selected expense details for the owner view.
   Data loading stays here so presentational components stay focused on rendering. */
import { useEffect, useState } from 'react';

import { API_BASE_URL, ApiError, get } from '../../shared/api/client';
import type { Expense, ExpenseDetail, ExpenseListResponse } from './types';

interface UseDashboardResult {
  expenses: Expense[];
  isLoading: boolean;
  message: string | null;
  selectedExpense: ExpenseDetail | null;
  selectExpense: (expenseId: string) => Promise<void>;
}

/** Load dashboard expenses and provide selection helpers for detail requests. */
export function useDashboard(): UseDashboardResult {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseDetail | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await get<ExpenseListResponse>('/api/expenses');
        setExpenses(response.expenses);
        setMessage(response.message ?? null);
      } catch (error) {
        // A visible failure is more useful than leaving the dashboard in a permanent loading state.
        // An ApiError means the backend answered and refused (e.g. no acting account); anything
        // else means no usable response came back, so point at the configured address.
        setMessage(
          error instanceof ApiError
            ? `The backend refused the request: ${error.message}`
            : `Could not reach the backend at ${API_BASE_URL}.`,
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const selectExpense = async (expenseId: string): Promise<void> => {
    const response = await get<ExpenseDetail>(`/api/expenses/${expenseId}`);
    setSelectedExpense(response);
  };

  return { expenses, isLoading, message, selectedExpense, selectExpense };
}
