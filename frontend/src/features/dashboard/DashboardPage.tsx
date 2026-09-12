/* Renders the private expenses dashboard using the backend expense API.
   This page does not own fetch details or row rendering concerns directly. */
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ExpenseDetail } from './ExpenseDetail';
import { ExpenseRow } from './ExpenseRow';
import { ExpenseSummary } from './ExpenseSummary';
import { useDashboard } from './useDashboard';

/** Render the private grouped-expense dashboard for the acting account. */
export function DashboardPage(): JSX.Element {
  const { expenses, isLoading, message, selectedExpense, selectExpense } = useDashboard();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <section>
      <ExpenseSummary expenses={expenses} />
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
