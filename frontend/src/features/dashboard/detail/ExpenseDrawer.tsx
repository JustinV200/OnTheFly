/* Opens one expense's detail beside the list instead of below it: a right-hand drawer on a laptop, a full-screen sheet on
   a phone. Overview renders at once from the list row; Transactions waits on the detail request; Signals loads its own
   report. The row's actions sit in the drawer footer so they stay in reach on every tab. Owner-only, never public. */
import { ApiQueryState } from '../../../shared/api/useApiQuery';
import { categoryLabel } from '../../../shared/format/categoryLabel';
import { Drawer, Tabs } from '../../../shared/ui';
import { ExpenseRowActions } from '../expenses/row/ExpenseRowActions';
import { SpendSignalsPanel } from '../signals/SpendSignalsPanel';
import type { Expense, ExpenseDetail } from '../types';
import { OverviewTab } from './OverviewTab';
import { TransactionsTab } from './TransactionsTab';

interface ExpenseDrawerProps {
  // The open row as the list last loaded it; null keeps the drawer closed.
  expense: Expense | null;
  // The open row's detail request (supporting transactions).
  detail: ApiQueryState<ExpenseDetail>;
  // The task behind the open expense's listing, if known; the footer action then opens it.
  taskId: string | null;
  onClose: () => void;
  onVisibilityChanged: () => void;
}

/** Render the drawer for the selected expense, or nothing while no row is open. */
export function ExpenseDrawer({ expense, detail, taskId, onClose, onVisibilityChanged }: ExpenseDrawerProps): JSX.Element | null {
  if (!expense) {
    return null;
  }

  const transactionCount = detail.data?.id === expense.id ? detail.data.supporting_transactions.length : undefined;
  return (
    <Drawer
      description={categoryLabel(expense.category)}
      // Full-size buttons here: the footer is the drawer's own action bar, not a dense list row.
      footer={<ExpenseRowActions expense={expense} onVisibilityChanged={onVisibilityChanged} size="md" taskId={taskId} />}
      isOpen
      onClose={onClose}
      title={expense.vendor}
    >
      <Tabs
        // Keyed by expense, so opening another row starts on its Overview rather than the last row's tab.
        key={expense.id}
        label={`${expense.vendor} detail`}
        tabs={[
          { id: 'overview', label: 'Overview', content: <OverviewTab expense={expense} /> },
          { id: 'transactions', label: 'Transactions', meta: transactionCount, content: <TransactionsTab detail={detail} /> },
          { id: 'signals', label: 'Signals', content: <SpendSignalsPanel expenseId={expense.id} /> },
        ]}
      />
    </Drawer>
  );
}
