/* Renders one grouped expense row in the private dashboard table.
   Row clicks are delegated upward so the table stays easy to test and reuse. */
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import type { Expense } from './types';

interface ExpenseRowProps {
  expense: Expense;
  onSelect: (expenseId: string) => void;
}

/** Render one selectable expense row with summary spend details. */
export function ExpenseRow({ expense, onSelect }: ExpenseRowProps): JSX.Element {
  return (
    <tr onClick={() => onSelect(expense.id)} style={{ cursor: 'pointer' }}>
      <td>{expense.vendor}</td>
      <td>{expense.category ?? 'Uncategorized'}</td>
      <td><MoneyDisplay amountMinor={expense.amount_minor_per_period} currency={expense.currency} /></td>
      <td>{expense.cadence}</td>
      <td><MoneyDisplay amountMinor={expense.annualized_amount_minor} currency={expense.currency} /></td>
      <td>{Math.round(expense.recurrence_confidence * 100)}%</td>
      <td>{expense.visibility === 'private' ? 'Private' : expense.visibility}</td>
    </tr>
  );
}
