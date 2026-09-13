/* The part of Spend shown once a business has imported transactions: loading, failure, and empty states, then the
   portfolio headline, the expense list, the selected expense's detail, and duplicate-vendor suggestions. */
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { Card, Stack } from '../../shared/ui';
import { VendorAliasPanel } from './aliases/VendorAliasPanel';
import type { ImportedSource } from './connection/types';
import { ExpenseDetail } from './detail/ExpenseDetail';
import { ExpenseList } from './expenses/ExpenseList';
import { SpendOverview } from './overview/SpendOverview';
import { useDashboard } from './useDashboard';

interface ImportedSpendProps {
  businessName: string;
  dashboard: ReturnType<typeof useDashboard>;
  // Stored transactions per provider, for the data-source tile.
  sources: ImportedSource[];
}

/** Render the headline and expense list, or the state that stands in for them. */
export function ImportedSpend({ businessName, dashboard, sources }: ImportedSpendProps): JSX.Element {
  if (!dashboard.list.data) {
    return dashboard.list.error
      ? <ErrorState error={dashboard.list.error} onRetry={dashboard.list.reload} title="Couldn’t load expenses" />
      : <LoadingSpinner label="Grouping transactions into expenses…" />;
  }

  const { expenses } = dashboard.list.data;
  if (expenses.length === 0) {
    return (
      <EmptyState title="No expenses found in the imported transactions">
        {dashboard.list.data.message ?? `${businessName}'s transactions didn't group into any recurring or one-off expenses.`}
      </EmptyState>
    );
  }

  const selectedExpenseId = dashboard.selectedExpenseId;
  return (
    <Stack gap={6}>
      <SpendOverview expenses={expenses} sources={sources} />
      {dashboard.list.error ? (
        <ErrorState error={dashboard.list.error} onRetry={dashboard.list.reload} title="Showing the last loaded expenses; a refresh failed" />
      ) : null}
      <ExpenseList
        expenses={expenses}
        // Opening the open row again closes it, so the owner can get back to scanning rows.
        onOpen={(expenseId) => dashboard.selectExpense(expenseId === selectedExpenseId ? null : expenseId)}
        onVisibilityChanged={dashboard.reload}
        selectedExpenseId={selectedExpenseId}
      />
      {selectedExpenseId ? (
        <Card label="Selected expense">
          <ExpenseDetail detail={dashboard.detail} />
        </Card>
      ) : null}
      <VendorAliasPanel
        onMerged={() => {
          // A merge deletes the alias expense row, so drop a selection that would now 404.
          dashboard.selectExpense(null);
          dashboard.reload();
        }}
      />
    </Stack>
  );
}
