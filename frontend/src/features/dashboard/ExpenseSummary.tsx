/* Renders the top-level tracked-spend summary for the dashboard.
   The summary stays separate from the table so it can evolve independently. */
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import type { Expense } from './types';

interface ExpenseSummaryProps {
  expenses: Expense[];
}

/** Render the total annualized tracked spend across grouped expenses. */
export function ExpenseSummary({ expenses }: ExpenseSummaryProps): JSX.Element {
  const totalAnnualized = expenses.reduce((sum, expense) => sum + expense.annualized_amount_minor, 0);

  return (
    <section style={{ backgroundColor: '#f8fafc', borderRadius: '12px', marginBottom: '1rem', padding: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>Tracked spend</h2>
      <p style={{ marginBottom: 0 }}>
        <MoneyDisplay amountMinor={totalAnnualized} currency="USD" /> / year across {expenses.length} expense groups
      </p>
    </section>
  );
}
