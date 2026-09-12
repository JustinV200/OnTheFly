/* Renders the private expenses dashboard: connection state, every expense, and its visibility.
   A public visitor gets a defined signed-out state instead of a failed request. */
import { Link } from 'react-router-dom';

import { useActingAccount } from '../../shared/account/ActingAccountContext';
import type { DemoAccount } from '../../shared/account/demoAccounts';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ConnectionPanel } from './connection/ConnectionPanel';
import { useConnection } from './connection/useConnection';
import { ExpenseDetail } from './ExpenseDetail';
import { ExpenseRow } from './ExpenseRow';
import { ExpenseSummary } from './ExpenseSummary';
import type { Expense } from './types';
import { useDashboard } from './useDashboard';

/** Render the private dashboard for the acting business, or the signed-out state. */
export function DashboardPage(): JSX.Element {
  const { account } = useActingAccount();
  if (!account) {
    return (
      <EmptyState action={<Link to="/marketplace">Browse the marketplace as a visitor</Link>} title="Signed out: no private dashboard">
        Pick a business in the bar above to see its private expenses. As a public visitor you see only what businesses have chosen
        to publish, which is exactly what a stranger on the internet sees.
      </EmptyState>
    );
  }
  return <OwnerDashboard account={account} />;
}

function OwnerDashboard({ account }: { account: DemoAccount }): JSX.Element {
  const dashboard = useDashboard();
  const connection = useConnection(dashboard.reload);
  const expenses = dashboard.list.data?.expenses ?? [];
  const hasImported = connection.status.data?.status === 'imported';

  return (
    <section>
      <ConnectionPanel
        businessName={account.businessName}
        importState={connection.importState}
        onImport={() => void connection.runImport()}
        status={connection.status}
      />

      {hasImported ? <ExpenseList account={account} dashboard={dashboard} expenses={expenses} /> : null}
    </section>
  );
}

interface ExpenseListProps {
  account: DemoAccount;
  dashboard: ReturnType<typeof useDashboard>;
  expenses: Expense[];
}

function ExpenseList({ account, dashboard, expenses }: ExpenseListProps): JSX.Element {
  if (!dashboard.list.data) {
    return dashboard.list.error
      ? <ErrorState error={dashboard.list.error} onRetry={dashboard.list.reload} title="Couldn’t load expenses" />
      : <LoadingSpinner label="Grouping transactions into expenses…" />;
  }
  if (expenses.length === 0) {
    return (
      <EmptyState title="No expenses found in the imported transactions">
        {dashboard.list.data.message ?? `${account.businessName}'s transactions didn't group into any recurring or one-off expenses.`}
      </EmptyState>
    );
  }

  return (
    <>
      <ExpenseSummary expenses={expenses} />
      {dashboard.list.error ? (
        <ErrorState error={dashboard.list.error} onRetry={dashboard.list.reload} title="Showing the last loaded expenses; a refresh failed" />
      ) : null}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: '760px', width: '100%' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th>Vendor</th>
              <th>Amount / period</th>
              <th>Annualized</th>
              <th>Recurrence</th>
              <th>Source</th>
              <th>Visibility</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <ExpenseRow
                expense={expense}
                isSelected={expense.id === dashboard.selectedExpenseId}
                key={expense.id}
                onSelect={dashboard.selectExpense}
                onVisibilityChanged={dashboard.reload}
              />
            ))}
          </tbody>
        </table>
      </div>
      <ExpenseDetail detail={dashboard.detail} hasSelection={dashboard.selectedExpenseId !== null} />
    </>
  );
}
