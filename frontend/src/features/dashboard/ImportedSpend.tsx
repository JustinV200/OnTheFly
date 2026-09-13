/* The part of Spend shown once a business has imported transactions: loading, failure, and empty states, then the
   portfolio headline, the duplicate-vendor notice, the expense list, and the selected expense's detail drawer.
   Each expense carries its REBID task id, so rows and the drawer can open that task. */
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { Stack } from '../../shared/ui';
import { DuplicateVendors } from './aliases/DuplicateVendors';
import { ExpenseDrawer } from './detail/ExpenseDrawer';
import { ExpenseList } from './expenses/ExpenseList';
import { SpendOverview } from './overview/SpendOverview';
import { useDashboard } from './useDashboard';

interface ImportedSpendProps {
  businessName: string;
  dashboard: ReturnType<typeof useDashboard>;
}

/** Render the headline and expense list, or the state that stands in for them. */
export function ImportedSpend({ businessName, dashboard }: ImportedSpendProps): JSX.Element {
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

  const { selectedExpenseId } = dashboard;
  const selectedExpense = expenses.find((expense) => expense.id === selectedExpenseId) ?? null;
  return (
    <Stack gap={6}>
      <SpendOverview expenses={expenses} />
      {dashboard.list.error ? (
        <ErrorState error={dashboard.list.error} onRetry={dashboard.list.reload} title="Showing the last loaded expenses; a refresh failed" />
      ) : null}
      <DuplicateVendors
        onMerged={() => {
          // A merge deletes the alias expense row, so drop a selection that would now 404.
          dashboard.selectExpense(null);
          dashboard.reload();
        }}
      />
      <ExpenseList
        expenses={expenses}
        onOpen={dashboard.selectExpense}
        onVisibilityChanged={dashboard.reload}
        selectedExpenseId={selectedExpenseId}
      />
      <ExpenseDrawer
        detail={dashboard.detail}
        // Looked up in the loaded list, so a row a merge removed simply closes the drawer.
        expense={selectedExpense}
        onClose={() => dashboard.selectExpense(null)}
        onVisibilityChanged={dashboard.reload}
        taskId={selectedExpense?.task_id ?? null}
      />
    </Stack>
  );
}
