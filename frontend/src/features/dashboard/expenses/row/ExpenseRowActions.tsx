/* The owner's next step for one expense: why it can never be published, publish it, or manage its public listing.
   Publishing always goes through the review flow; nothing on the dashboard publishes directly (CLAUDE.md, visibility). */
import { ButtonLink, Icon } from '../../../../shared/ui';
import { UnpublishButton } from '../../../publish/UnpublishButton';
import type { Expense } from '../../types';
import './ExpenseRowActions.css';

// Payroll, taxes, and transfers are never publishable spend (CLAUDE.md, money and math).
const INELIGIBLE_REASONS: Record<string, string> = {
  owner_marked_ineligible: 'Marked not publishable',
  payroll: 'Payroll is never publishable',
  tax: 'Taxes are never publishable',
  transfer: 'Transfers are never publishable',
};

interface ExpenseRowActionsProps {
  expense: Expense;
  onVisibilityChanged: () => void;
}

/** Render the ineligibility reason, the review-and-publish link, or the inbox and unpublish controls. */
export function ExpenseRowActions({ expense, onVisibilityChanged }: ExpenseRowActionsProps): JSX.Element {
  if (!expense.is_publishable) {
    return (
      <span className="expense-row-actions__ineligible">
        <Icon name="lock" size={14} />
        {INELIGIBLE_REASONS[expense.eligibility_reason] ?? expense.eligibility_reason}
      </span>
    );
  }
  if (expense.visibility === 'public' && expense.listing_id) {
    return (
      <span className="expense-row-actions">
        <ButtonLink size="sm" to={`/listings/${expense.listing_id}/inbox`}>Offers inbox</ButtonLink>
        <UnpublishButton listingId={expense.listing_id} onUnpublished={onVisibilityChanged} />
      </span>
    );
  }
  return (
    <span className="expense-row-actions">
      <ButtonLink size="sm" to={`/publish?expense=${expense.id}`}>{expense.listing_id ? 'Publish again…' : 'Review & publish…'}</ButtonLink>
      {/* An unpublished listing keeps the offers it received while public. */}
      {expense.listing_id ? <ButtonLink size="sm" to={`/listings/${expense.listing_id}/inbox`}>Retained offers</ButtonLink> : null}
    </span>
  );
}
