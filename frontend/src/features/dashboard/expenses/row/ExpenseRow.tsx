/* Renders one grouped expense row: figures, where they came from, visibility, and the owner's next action.
   The whole row toggles its detail, and the vendor name is a real disclosure button, so keyboard users can open it too.
   Every cell carries data-label, because the table stacks into one card per expense on a phone. */
import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { categoryLabel } from '../../../../shared/format/categoryLabel';
import { ProvenanceBadge } from '../../../../shared/provenance/ProvenanceBadge';
import { Icon, joinClassNames } from '../../../../shared/ui';
import type { Expense } from '../../types';
import { ExpenseRowActions } from './ExpenseRowActions';
import { VisibilityBadge } from './VisibilityBadge';
import './ExpenseRow.css';

interface ExpenseRowProps {
  expense: Expense;
  isSelected: boolean;
  // Id of the detail row this row opens; referenced only while that row exists.
  detailId: string;
  onToggle: (expenseId: string) => void;
  onVisibilityChanged: () => void;
}

/** Render one expandable expense row with summary spend details and its publish controls. */
export function ExpenseRow({ expense, isSelected, detailId, onToggle, onVisibilityChanged }: ExpenseRowProps): JSX.Element {
  return (
    <tr className={joinClassNames('expense-row', isSelected && 'is-selected')} onClick={() => onToggle(expense.id)}>
      <td className="expense-row__vendor">
        <button
          aria-controls={isSelected ? detailId : undefined}
          aria-expanded={isSelected}
          className="expense-row__toggle"
          onClick={(event) => {
            // The row also toggles on click; stop here so one press doesn't open and close it again.
            event.stopPropagation();
            onToggle(expense.id);
          }}
          type="button"
        >
          <Icon className="expense-row__chevron" name="chevron-down" />
          <span className="expense-row__vendor-name">{expense.vendor}</span>
        </button>
        <div className="expense-row__category ui-text-sm ui-text-muted">{categoryLabel(expense.category)}</div>
      </td>
      <td data-label="Visibility"><VisibilityBadge visibility={expense.visibility} /></td>
      <td className="ui-num" data-label="Amount / period">
        <span className="expense-row__figure"><MoneyDisplay amountMinor={expense.amount_minor_per_period} currency={expense.currency} /></span>
        <div className="ui-text-sm ui-text-muted">{expense.cadence}</div>
      </td>
      <td className="ui-num" data-label="Annualized">
        <MoneyDisplay amountMinor={expense.annualized_amount_minor} currency={expense.currency} />
        <span className="ui-text-sm ui-text-muted"> / yr</span>
      </td>
      <td className="ui-num" data-label="Recurrence">
        {Math.round(expense.recurrence_confidence * 100)}%
        <div className="ui-text-sm ui-text-muted">{expense.period_count} {expense.period_count === 1 ? 'payment' : 'payments'}</div>
      </td>
      <td data-label="Source">
        <span className="expense-row__badges">
          {expense.provenance.map((value) => <ProvenanceBadge key={value} kind="financial" value={value} />)}
        </span>
      </td>
      {/* Actions navigate or unpublish; they must not also toggle the row. */}
      <td className="expense-row__actions-cell" data-label="Actions" onClick={(event) => event.stopPropagation()}>
        <ExpenseRowActions expense={expense} onVisibilityChanged={onVisibilityChanged} />
      </td>
    </tr>
  );
}
