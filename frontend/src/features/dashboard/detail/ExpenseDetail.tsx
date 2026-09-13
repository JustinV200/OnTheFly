/* Shows how one grouped expense's baseline was observed: every transaction behind it beside its fly-brain spend signals.
   This panel is private owner data and is never reused for public pages. */
import { ApiQueryState } from '../../../shared/api/useApiQuery';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Callout, Card, Stack } from '../../../shared/ui';
import { SpendSignalsPanel } from '../signals/SpendSignalsPanel';
import type { ExpenseDetail as ExpenseDetailModel } from '../types';
import { SupportingTransactionList } from './SupportingTransactionList';
import './ExpenseDetail.css';

interface ExpenseDetailProps {
  // The open row's detail request; the table renders this only while a row is open.
  detail: ApiQueryState<ExpenseDetailModel>;
}

/** Render the selected expense's observation period, supporting transactions, and spend signals. */
export function ExpenseDetail({ detail }: ExpenseDetailProps): JSX.Element {
  if (!detail.data) {
    return detail.error
      ? <ErrorState error={detail.error} onRetry={detail.reload} title="Couldn’t load this expense’s transactions" />
      : <LoadingSpinner label="Loading supporting transactions…" />;
  }

  const expense = detail.data;
  return (
    <Stack className="expense-detail" gap={5}>
      <Stack gap={2}>
        <h3 className="expense-detail__title">{expense.vendor}</h3>
        <p className="expense-detail__lead">
          Baseline <MoneyDisplay amountMinor={expense.amount_minor_per_period} currency={expense.currency} /> per {expense.cadence}{' '}
          period from {expense.period_count} payments, {formatTimestamp(expense.first_seen, { dateOnly: true })} to{' '}
          {formatTimestamp(expense.last_seen, { dateOnly: true })}, annualized to{' '}
          <MoneyDisplay amountMinor={expense.annualized_amount_minor} currency={expense.currency} />.{' '}
          {expense.provenance.map((value) => <ProvenanceBadge key={value} kind="financial" value={value} />)}
        </p>
      </Stack>
      <div className="expense-detail__columns">
        <Card title={`Supporting transactions (${expense.supporting_transactions.length})`} titleLevel={4}>
          <Stack gap={4}>
            <Callout role="note" tone="private">
              Transactions show payment patterns, not contract terms. This history is never published, even when the expense is.
            </Callout>
            <SupportingTransactionList transactions={expense.supporting_transactions} />
          </Stack>
        </Card>
        <SpendSignalsPanel expenseId={expense.id} />
      </div>
    </Stack>
  );
}
