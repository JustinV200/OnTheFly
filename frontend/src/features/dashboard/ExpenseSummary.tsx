/* Renders the tracked-spend total and the private-by-default count that opens the privacy proof. */
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { ProvenanceBadge } from '../../shared/provenance/ProvenanceBadge';
import type { Expense } from './types';

interface ExpenseSummaryProps {
  expenses: Expense[];
}

/** Render total annualized spend, how many expenses are public, and where the figures came from. */
export function ExpenseSummary({ expenses }: ExpenseSummaryProps): JSX.Element {
  // Totals only add like currencies; a second currency is listed separately, never converted.
  const totalsByCurrency = expenses.reduce<Record<string, number>>((totals, expense) => {
    totals[expense.currency] = (totals[expense.currency] ?? 0) + expense.annualized_amount_minor;
    return totals;
  }, {});
  const publicCount = expenses.filter((expense) => expense.visibility === 'public').length;
  const provenance = Array.from(new Set(expenses.flatMap((expense) => expense.provenance))).sort();

  return (
    <section style={{ backgroundColor: '#f8fafc', borderRadius: '12px', marginBottom: '1rem', padding: '1rem' }}>
      <h2 style={{ margin: '0 0 0.25rem' }}>Your expenses (private)</h2>
      <p style={{ fontSize: '1.1rem', margin: '0 0 0.5rem' }}>
        {Object.entries(totalsByCurrency).map(([currency, total], index) => (
          <span key={currency}>
            {index > 0 ? ' + ' : null}
            <MoneyDisplay amountMinor={total} currency={currency} />
          </span>
        ))}{' '}
        / year tracked across {expenses.length} expense groups
      </p>
      <p style={{ margin: 0 }}>
        <strong>{expenses.length - publicCount} private</strong>, <strong>{publicCount} public</strong>. Nothing goes public
        unless you publish that one expense yourself.{' '}
        {provenance.map((value) => <ProvenanceBadge key={value} kind="financial" value={value} />)}
      </p>
    </section>
  );
}
