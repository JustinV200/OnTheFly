/* The expenses half of the private dashboard: its loading, failure, and empty states, then the spend summary, the
   expense table, and duplicate-vendor suggestions. Rendered only once the business has imported transactions. */
import { useId } from 'react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { Cluster, Stack } from '../../../shared/ui';
import { VendorAliasPanel } from '../aliases/VendorAliasPanel';
import type { Expense } from '../types';
import { useDashboard } from '../useDashboard';
import { ExpenseSummary } from './ExpenseSummary';
import { ExpenseTable } from './ExpenseTable';

interface ExpenseListProps {
  businessName: string;
  dashboard: ReturnType<typeof useDashboard>;
}

/** Render the "Your expenses" section and, when there are expenses, the vendor alias suggestions after it. */
export function ExpenseList({ businessName, dashboard }: ExpenseListProps): JSX.Element {
  const headingId = useId();
  const expenses = dashboard.list.data?.expenses ?? [];
  const hasExpenses = expenses.length > 0;

  return (
    <>
      <section aria-labelledby={headingId}>
        <Stack gap={4}>
          <Cluster align="baseline" gap={2} justify="between">
            <h2 id={headingId}>Your expenses</h2>
            {hasExpenses ? <p className="ui-text-sm ui-text-muted">Select an expense to see the transactions behind its figures.</p> : null}
          </Cluster>
          <ExpenseListContent businessName={businessName} dashboard={dashboard} expenses={expenses} />
        </Stack>
      </section>
      {hasExpenses ? (
        <VendorAliasPanel
          onMerged={() => {
            // A merge deletes the alias expense row, so drop a selection that would now 404.
            dashboard.selectExpense(null);
            dashboard.reload();
          }}
        />
      ) : null}
    </>
  );
}

interface ExpenseListContentProps extends ExpenseListProps {
  expenses: Expense[];
}

function ExpenseListContent({ businessName, dashboard, expenses }: ExpenseListContentProps): JSX.Element {
  if (!dashboard.list.data) {
    return dashboard.list.error
      ? <ErrorState error={dashboard.list.error} onRetry={dashboard.list.reload} title="Couldn’t load expenses" />
      : <LoadingSpinner label="Grouping transactions into expenses…" />;
  }
  if (expenses.length === 0) {
    return (
      <EmptyState title="No expenses found in the imported transactions">
        {dashboard.list.data.message ?? `${businessName}'s transactions didn't group into any recurring or one-off expenses.`}
      </EmptyState>
    );
  }

  const selectedExpenseId = dashboard.selectedExpenseId;
  return (
    <>
      <ExpenseSummary expenses={expenses} />
      {dashboard.list.error ? (
        <ErrorState error={dashboard.list.error} onRetry={dashboard.list.reload} title="Showing the last loaded expenses; a refresh failed" />
      ) : null}
      <ExpenseTable
        detail={dashboard.detail}
        expenses={expenses}
        // Opening the open row again closes it, so the owner can get back to scanning rows without scrolling past a detail.
        onToggle={(expenseId) => dashboard.selectExpense(expenseId === selectedExpenseId ? null : expenseId)}
        onVisibilityChanged={dashboard.reload}
        selectedExpenseId={selectedExpenseId}
      />
    </>
  );
}
