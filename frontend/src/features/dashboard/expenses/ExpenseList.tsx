/* The Spend expense list: a header that states shared provenance once, column labels on a laptop, publishable rows by
   annual cost, then payroll, tax, and transfer rows grouped at the bottom and dimmed. Rows are cards on a phone.
   Presentation only: it receives loaded expenses and reports which one the owner opened. */
import { useId } from 'react';

import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Card, Cluster } from '../../../shared/ui';
import { sharedProvenance } from '../provenance/sharedProvenance';
import type { Expense } from '../types';
import { isNeverPublishable } from '../visibility/notPublishableReason';
import { arrangeExpenses } from './arrangeExpenses';
import { ExpenseRow } from './row/ExpenseRow';
import './ExpenseList.css';

interface ExpenseListProps {
  expenses: Expense[];
  // Listing id → task id, so a row whose expense already has a task can open it.
  taskIdByListingId: ReadonlyMap<string, string>;
  selectedExpenseId: string | null;
  onOpen: (expenseId: string) => void;
  onVisibilityChanged: () => void;
}

/** Render the "Expenses" section with its grouped, sorted rows. Assumes at least one expense. */
export function ExpenseList({ expenses, taskIdByListingId, selectedExpenseId, onOpen, onVisibilityChanged }: ExpenseListProps): JSX.Element {
  const headingId = useId();
  const groupHeadingId = useId();
  const { publishable, notPublishable } = arrangeExpenses(expenses);
  // When every row has the same provenance it is stated once here; otherwise each row carries its own badge.
  const commonProvenance = sharedProvenance(expenses.map((expense) => expense.provenance));
  const isAllNever = notPublishable.every((expense) => isNeverPublishable(expense.eligibility_reason));

  const renderRow = (expense: Expense): JSX.Element => (
    <ExpenseRow
      expense={expense}
      isSelected={expense.id === selectedExpenseId}
      key={expense.id}
      onOpen={onOpen}
      onVisibilityChanged={onVisibilityChanged}
      shouldShowProvenance={commonProvenance === null}
      taskId={expense.listing_id ? taskIdByListingId.get(expense.listing_id) ?? null : null}
    />
  );

  return (
    <section aria-labelledby={headingId} className="expense-list">
      <Cluster align="baseline" className="expense-list__header" gap={3} justify="between">
        <Cluster align="baseline" gap={2}>
          <h2 className="expense-list__title" id={headingId}>Expenses</h2>
          <span className="ui-text-sm ui-text-muted">{expenses.length} · largest first</span>
        </Cluster>
        {commonProvenance ? (
          <Cluster gap={2}>
            <span className="ui-text-sm ui-text-muted">All figures:</span>
            {commonProvenance.map((value) => <ProvenanceBadge key={value} kind="financial" value={value} />)}
          </Cluster>
        ) : (
          <span className="ui-text-sm ui-text-muted">Sources differ: each row shows its own</span>
        )}
      </Cluster>

      <Card as="div" className="expense-list__card" padding="none">
        <div aria-hidden="true" className="expense-list__columns">
          <span>Vendor</span>
          <span className="expense-list__column--end">Annual cost</span>
          <span>Pattern</span>
          <span>Visibility</span>
          <span className="expense-list__column--end">Action</span>
        </div>

        {publishable.length > 0 ? <ul className="expense-list__rows">{publishable.map(renderRow)}</ul> : null}

        {notPublishable.length > 0 ? (
          <section aria-labelledby={groupHeadingId} className="expense-list__group">
            <div className="expense-list__group-header">
              <h3 className="expense-list__group-title" id={groupHeadingId}>
                {isAllNever ? 'Never publishable' : 'Not publishable'}
              </h3>
              <span className="ui-text-sm ui-text-muted">Payroll, taxes, and transfers never go public. The reason is on each row.</span>
            </div>
            <ul className="expense-list__rows">{notPublishable.map(renderRow)}</ul>
          </section>
        ) : null}
      </Card>
    </section>
  );
}
