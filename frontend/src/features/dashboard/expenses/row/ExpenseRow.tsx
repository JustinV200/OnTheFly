/* One expense in the Spend list: vendor and category, annual cost with the per-period amount beneath, the payment
   pattern in words, visibility, and the owner's action. A card on a phone, a single grid row on a laptop.
   The vendor name is a real button that opens the detail, so the row works from the keyboard; a click anywhere else on
   the row does the same for pointer users. Owner-only: never reused on public pages. */
import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { categoryLabel } from '../../../../shared/format/categoryLabel';
import { ProvenanceBadge } from '../../../../shared/provenance/ProvenanceBadge';
import { joinClassNames } from '../../../../shared/ui';
import type { Expense } from '../../types';
import { VisibilityBadge } from '../../visibility/VisibilityBadge';
import { describePattern } from './describePattern';
import { ExpenseRowActions } from './ExpenseRowActions';
import { perPeriodLabel } from './perPeriodLabel';
import './ExpenseRow.css';

interface ExpenseRowProps {
  expense: Expense;
  isSelected: boolean;
  // False when the list header already states the one provenance every row shares.
  shouldShowProvenance: boolean;
  onOpen: (expenseId: string) => void;
  onVisibilityChanged: () => void;
}

/** Render one expense row; payroll, tax, and transfer rows render dimmed with their reason in place of an action. */
export function ExpenseRow({ expense, isSelected, shouldShowProvenance, onOpen, onVisibilityChanged }: ExpenseRowProps): JSX.Element {
  const pattern = describePattern(expense);

  return (
    <li
      className={joinClassNames('expense-row', !expense.is_publishable && 'expense-row--muted', isSelected && 'is-selected')}
      onClick={() => onOpen(expense.id)}
    >
      <div className="expense-row__vendor">
        <button
          aria-haspopup="dialog"
          className="expense-row__open"
          onClick={(event) => {
            // The row also opens on click; stop here so one press doesn't open it twice.
            event.stopPropagation();
            onOpen(expense.id);
          }}
          type="button"
        >
          {expense.vendor}
        </button>
        <span className="expense-row__category">{categoryLabel(expense.category)}</span>
        {shouldShowProvenance ? (
          <span className="expense-row__provenance">
            {expense.provenance.map((value) => <ProvenanceBadge key={value} kind="financial" value={value} />)}
          </span>
        ) : null}
      </div>

      <div className="expense-row__cost">
        <span className="ui-visually-hidden">Annual cost </span>
        <span className="expense-row__annual">
          <MoneyDisplay amountMinor={expense.annualized_amount_minor} currency={expense.currency} />
          <span className="expense-row__unit"> / yr</span>
        </span>
        <span className="expense-row__period">
          <MoneyDisplay amountMinor={expense.amount_minor_per_period} currency={expense.currency} />{' '}
          {perPeriodLabel(expense.cadence, expense.period_count)}
        </span>
      </div>

      <div className="expense-row__pattern">
        <span className="ui-visually-hidden">Pattern </span>
        <span className="expense-row__rhythm" title={pattern.tooltip}>{pattern.rhythm}</span>
        <span className="expense-row__detail">{pattern.detail}</span>
      </div>

      <div className="expense-row__visibility">
        <VisibilityBadge size="sm" visibility={expense.visibility} />
      </div>

      {/* Actions navigate or unpublish; they must not also open the row. */}
      <div className="expense-row__actions" onClick={(event) => event.stopPropagation()}>
        <ExpenseRowActions expense={expense} onVisibilityChanged={onVisibilityChanged} />
      </div>
    </li>
  );
}
