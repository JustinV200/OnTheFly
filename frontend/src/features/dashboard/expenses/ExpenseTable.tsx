/* Lays out the owner's expenses as a table whose selected row opens its detail directly underneath.
   On a phone the table stacks into one card per expense (layout="stack"), so nothing scrolls sideways.
   Owner-only: this table and its detail are never reused on public pages. */
import { Fragment } from 'react';

import { ApiQueryState } from '../../../shared/api/useApiQuery';
import { Table } from '../../../shared/ui';
import { ExpenseDetail } from '../detail/ExpenseDetail';
import type { Expense, ExpenseDetail as ExpenseDetailModel } from '../types';
import { ExpenseRow } from './row/ExpenseRow';
import './ExpenseTable.css';

// The detail cell spans every column; keep in step with the header below.
const COLUMN_COUNT = 7;

interface ExpenseTableProps {
  expenses: Expense[];
  selectedExpenseId: string | null;
  // The selected expense's detail request; only rendered inside the open row.
  detail: ApiQueryState<ExpenseDetailModel>;
  onToggle: (expenseId: string) => void;
  onVisibilityChanged: () => void;
}

/** Render every expense row, with the selected expense's detail row right after it. */
export function ExpenseTable({ expenses, selectedExpenseId, detail, onToggle, onVisibilityChanged }: ExpenseTableProps): JSX.Element {
  return (
    <Table className="expense-table" isInteractive label="Your expenses" layout="stack" minWidth="880px">
      <thead>
        <tr>
          <th scope="col">Vendor</th>
          <th scope="col">Visibility</th>
          <th className="ui-num" scope="col">Amount / period</th>
          <th className="ui-num" scope="col">Annualized</th>
          <th className="ui-num" scope="col">Recurrence</th>
          <th scope="col">Source</th>
          <th className="expense-table__actions-heading" scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        {expenses.map((expense) => {
          const isSelected = expense.id === selectedExpenseId;
          const detailId = `expense-detail-${expense.id}`;
          return (
            <Fragment key={expense.id}>
              <ExpenseRow
                detailId={detailId}
                expense={expense}
                isSelected={isSelected}
                onToggle={onToggle}
                onVisibilityChanged={onVisibilityChanged}
              />
              {isSelected ? (
                <tr className="expense-table__detail-row" id={detailId}>
                  <td className="expense-table__detail-cell" colSpan={COLUMN_COUNT}>
                    <ExpenseDetail detail={detail} />
                  </td>
                </tr>
              ) : null}
            </Fragment>
          );
        })}
      </tbody>
    </Table>
  );
}
