/* The owner's next step for one expense: why it can never be published, publish it, or manage its public listing.
   Publishing always goes through the review flow; nothing on Spend publishes directly (CLAUDE.md, visibility).
   Unpublish stays a visible one-click button beside the listing's offers, never behind a menu. */
import { ButtonLink, Icon } from '../../../../shared/ui';
import { UnpublishButton } from '../../../publish/UnpublishButton';
import type { Expense } from '../../types';
import { notPublishableReason } from '../../visibility/notPublishableReason';
import './ExpenseRowActions.css';

interface ExpenseRowActionsProps {
  expense: Expense;
  onVisibilityChanged: () => void;
}

/** Render the ineligibility reason, the publish link, or the offers and unpublish controls. */
export function ExpenseRowActions({ expense, onVisibilityChanged }: ExpenseRowActionsProps): JSX.Element {
  if (!expense.is_publishable) {
    return (
      <span className="expense-row-actions__ineligible">
        <Icon name="lock" size={14} />
        {notPublishableReason(expense.eligibility_reason)}
      </span>
    );
  }
  if (expense.visibility === 'public' && expense.listing_id) {
    return (
      <span className="expense-row-actions">
        <ButtonLink size="sm" to={`/listings/${expense.listing_id}/inbox`}>Offers</ButtonLink>
        <UnpublishButton listingId={expense.listing_id} onUnpublished={onVisibilityChanged} size="sm" />
      </span>
    );
  }
  return (
    <span className="expense-row-actions">
      <ButtonLink size="sm" to={`/publish?expense=${expense.id}`} variant="primary">
        {expense.listing_id ? 'Publish again…' : 'Publish…'}
      </ButtonLink>
      {/* An unpublished listing keeps the offers it received while public. */}
      {expense.listing_id ? <ButtonLink size="sm" to={`/listings/${expense.listing_id}/inbox`}>Retained offers</ButtonLink> : null}
    </span>
  );
}
