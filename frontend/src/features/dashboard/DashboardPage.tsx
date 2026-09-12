/* Renders the private expenses dashboard using the backend expense API.
   This page does not own fetch details or row rendering concerns directly. */
import { useState } from 'react';

import { post } from '../../shared/api/client';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ExpenseDetail } from './ExpenseDetail';
import { ExpenseRow } from './ExpenseRow';
import { ExpenseSummary } from './ExpenseSummary';
import { useDashboard } from './useDashboard';

/** Render the private grouped-expense dashboard for the acting account. */
export function DashboardPage(): JSX.Element {
  const { expenses, isLoading, message, selectedExpense, selectExpense } = useDashboard();
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async (): Promise<void> => {
    setIsImporting(true);
    setImportMessage(null);
    try {
      const result = await post<{ imported: number; skipped: number }>('/api/expenses/import', {
        provider_account_id: 'acc_owner_1',
      });
      setImportMessage(`Import complete: ${result.imported} new, ${result.skipped} skipped.`);
    } catch {
      setImportMessage('Import failed — check backend logs.');
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <ExpenseSummary expenses={expenses} />
        <button onClick={() => void handleImport()} disabled={isImporting} type="button">
          {isImporting ? 'Importing…' : '↩ Refresh from account'}
        </button>
      </div>
      {importMessage ? <p>{importMessage}</p> : null}
      {message ? <p>{message}</p> : null}
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th align="left">Vendor</th>
            <th align="left">Category</th>
            <th align="left">Amount / period</th>
            <th align="left">Cadence</th>
            <th align="left">Annualized</th>
            <th align="left">Confidence</th>
            <th align="left">Visibility</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <ExpenseRow key={expense.id} expense={expense} onSelect={(expenseId) => void selectExpense(expenseId)} />
          ))}
        </tbody>
      </table>
      <ExpenseDetail expense={selectedExpense} />
    </section>
  );
}
