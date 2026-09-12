/* Shows how one grouped expense's baseline was observed, and every transaction behind it.
   This panel is private owner data and is never reused for public pages. */
import { ApiQueryState } from '../../shared/api/useApiQuery';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../shared/provenance/ProvenanceBadge';
import { SpendSignalsPanel } from './signals/SpendSignalsPanel';
import type { ExpenseDetail as ExpenseDetailModel } from './types';

interface ExpenseDetailProps {
  detail: ApiQueryState<ExpenseDetailModel>;
  hasSelection: boolean;
}

/** Render the selected expense's observation period and supporting transactions. */
export function ExpenseDetail({ detail, hasSelection }: ExpenseDetailProps): JSX.Element {
  if (!hasSelection) {
    return <p style={{ color: '#475569' }}>Select an expense to see the transactions behind its figures.</p>;
  }
  if (!detail.data) {
    return detail.error
      ? <ErrorState error={detail.error} onRetry={detail.reload} title="Couldn’t load this expense’s transactions" />
      : <LoadingSpinner label="Loading supporting transactions…" />;
  }

  const expense = detail.data;
  return (
    <section style={{ border: '1px solid #e2e8f0', borderRadius: '12px', marginTop: '1rem', padding: '1rem' }}>
      <h3 style={{ margin: '0 0 0.25rem' }}>{expense.vendor}: supporting transactions</h3>
      <p style={{ margin: '0 0 0.5rem' }}>
        Baseline <MoneyDisplay amountMinor={expense.amount_minor_per_period} currency={expense.currency} /> per {expense.cadence}{' '}
        period from {expense.period_count} payments, {formatTimestamp(expense.first_seen, { dateOnly: true })} to{' '}
        {formatTimestamp(expense.last_seen, { dateOnly: true })}, annualized to{' '}
        <MoneyDisplay amountMinor={expense.annualized_amount_minor} currency={expense.currency} />.
      </p>
      <p style={{ color: '#475569', fontSize: '0.9rem', margin: '0 0 0.5rem' }}>
        Transactions show payment patterns, not contract terms. This history is never published, even when the expense is.
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {expense.supporting_transactions.map((transaction) => (
          <li key={transaction.id} style={{ borderTop: '1px solid #e2e8f0', padding: '0.6rem 0' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'space-between' }}>
              <span>
                <span style={{ color: '#475569' }}>{formatTimestamp(transaction.posted_at, { dateOnly: true })}</span>
                {' · '}
                <code>{transaction.raw_description}</code>
              </span>
              <MoneyDisplay amountMinor={transaction.amount_minor} currency={transaction.currency} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <ProvenanceBadge kind="financial" value={transaction.source_type} />
              {/* Pending Stripe charges and credits stay listed for audit but don't count toward the baseline. */}
              <span style={{ color: '#475569' }}>{transaction.status} · {transaction.direction}</span>
              {transaction.is_excluded ? <span>Excluded from spend: {transaction.excluded_reason}</span> : null}
            </div>
          </li>
        ))}
      </ul>
      <SpendSignalsPanel expenseId={expense.id} />
    </section>
  );
}
