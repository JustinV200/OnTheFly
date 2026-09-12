/* Renders one grouped expense row: figures, where they came from, visibility, and the owner's next action.
   Row clicks are delegated upward so the table stays easy to test and reuse. */
import { Link } from 'react-router-dom';

import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { categoryLabel } from '../../shared/format/categoryLabel';
import { ProvenanceBadge } from '../../shared/provenance/ProvenanceBadge';
import { UnpublishButton } from '../publish/UnpublishButton';
import type { Expense } from './types';
import { VisibilityBadge } from './VisibilityBadge';

const INELIGIBLE_REASONS: Record<string, string> = {
  owner_marked_ineligible: 'marked not publishable',
  payroll: 'payroll is never publishable',
  tax: 'taxes are never publishable',
  transfer: 'transfers are never publishable',
};

interface ExpenseRowProps {
  expense: Expense;
  isSelected: boolean;
  onSelect: (expenseId: string) => void;
  onVisibilityChanged: () => void;
}

/** Render one selectable expense row with summary spend details and its publish controls. */
export function ExpenseRow({ expense, isSelected, onSelect, onVisibilityChanged }: ExpenseRowProps): JSX.Element {
  return (
    <tr
      onClick={() => onSelect(expense.id)}
      style={{ backgroundColor: isSelected ? '#eff6ff' : undefined, borderTop: '1px solid #e2e8f0', cursor: 'pointer' }}
    >
      <td style={{ padding: '0.6rem 0.5rem' }}>
        <strong>{expense.vendor}</strong>
        <div style={{ color: '#475569', fontSize: '0.85rem' }}>{categoryLabel(expense.category)}</div>
      </td>
      <td>
        <MoneyDisplay amountMinor={expense.amount_minor_per_period} currency={expense.currency} />
        <div style={{ color: '#475569', fontSize: '0.85rem' }}>{expense.cadence}</div>
      </td>
      <td><MoneyDisplay amountMinor={expense.annualized_amount_minor} currency={expense.currency} /> / yr</td>
      <td>
        {Math.round(expense.recurrence_confidence * 100)}%
        <div style={{ color: '#475569', fontSize: '0.85rem' }}>{expense.period_count} {expense.period_count === 1 ? 'payment' : 'payments'}</div>
      </td>
      <td>{expense.provenance.map((value) => <ProvenanceBadge key={value} kind="financial" value={value} />)}</td>
      <td><VisibilityBadge visibility={expense.visibility} /></td>
      <td onClick={(event) => event.stopPropagation()}>
        <RowAction expense={expense} onVisibilityChanged={onVisibilityChanged} />
      </td>
    </tr>
  );
}

function RowAction({ expense, onVisibilityChanged }: { expense: Expense; onVisibilityChanged: () => void }): JSX.Element {
  if (!expense.is_publishable) {
    return <span style={{ color: '#64748b' }}>⊘ {INELIGIBLE_REASONS[expense.eligibility_reason] ?? expense.eligibility_reason}</span>;
  }
  if (expense.visibility === 'public' && expense.listing_id) {
    return (
      <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <Link to={`/listings/${expense.listing_id}/inbox`}>Offers inbox</Link>
        <UnpublishButton listingId={expense.listing_id} onUnpublished={onVisibilityChanged} />
      </span>
    );
  }
  return (
    <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      <Link to={`/publish?expense=${expense.id}`}>{expense.listing_id ? 'Publish again…' : 'Review & publish…'}</Link>
      {/* An unpublished listing keeps the offers it received while public. */}
      {expense.listing_id ? <Link to={`/listings/${expense.listing_id}/inbox`}>Retained offers</Link> : null}
    </span>
  );
}
