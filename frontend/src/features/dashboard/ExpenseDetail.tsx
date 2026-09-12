/* Shows the supporting transactions behind one grouped expense.
   This panel remains private-owner data and is never reused for public pages. */
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { ProvenanceBadge } from '../../shared/components/ProvenanceBadge';
import type { ExpenseDetail as ExpenseDetailModel } from './types';

interface ExpenseDetailProps {
  expense: ExpenseDetailModel | null;
}

/** Render the selected expense detail and its supporting transactions. */
export function ExpenseDetail({ expense }: ExpenseDetailProps): JSX.Element {
  if (!expense) {
    return <section><p>Select an expense row to inspect its supporting transactions.</p></section>;
  }

  return (
    <section style={{ marginTop: '1rem' }}>
      <h3 style={{ marginBottom: '0.5rem' }}>{expense.vendor}</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {expense.supporting_transactions.map((transaction) => (
          <li key={transaction.id} style={{ borderTop: '1px solid #e2e8f0', padding: '0.75rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{transaction.raw_description}</span>
              <MoneyDisplay amountMinor={transaction.amount_minor} currency={transaction.currency} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <ProvenanceBadge label={transaction.source_type} />
              {transaction.is_excluded ? <span>Excluded: {transaction.excluded_reason}</span> : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
