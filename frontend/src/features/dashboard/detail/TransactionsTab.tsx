/* The Transactions tab of an expense: every stored row behind its figures, including rows excluded from spend, with the
   reminder that transactions show payment patterns, not contract terms. It waits on the expense detail request. */
import { ApiQueryState } from '../../../shared/api/useApiQuery';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { Callout, Stack } from '../../../shared/ui';
import type { ExpenseDetail } from '../types';
import { SupportingTransactionList } from './SupportingTransactionList';

interface TransactionsTabProps {
  detail: ApiQueryState<ExpenseDetail>;
}

/** Render the loading or failed state, or the note and the transaction list. */
export function TransactionsTab({ detail }: TransactionsTabProps): JSX.Element {
  if (!detail.data) {
    return detail.error
      ? <ErrorState error={detail.error} onRetry={detail.reload} title="Couldn’t load this expense’s transactions" />
      : <LoadingSpinner label="Loading supporting transactions…" />;
  }

  return (
    <Stack gap={4}>
      {detail.error ? (
        <ErrorState error={detail.error} onRetry={detail.reload} title="Showing the last loaded transactions; a refresh failed" />
      ) : null}
      <Callout role="note" tone="private">
        Transactions show payment patterns, not contract terms. This history is never published, even when the expense is.
      </Callout>
      <SupportingTransactionList transactions={detail.data.supporting_transactions} />
    </Stack>
  );
}
