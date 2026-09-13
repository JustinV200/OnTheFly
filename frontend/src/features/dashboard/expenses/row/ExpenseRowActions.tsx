/* The owner's next step for one expense: why it can never be published, REBID it (or open the task a REBID made), publish
   it through the older wizard when REBID doesn't cover its category, or manage its public listing. Nothing on Spend
   publishes directly; both paths end at an exact preview (CLAUDE.md, visibility). Unpublish stays a visible one-click
   button, never behind a menu. The same component is the expense drawer's footer, so the row and drawer never disagree;
   only the button size differs, since the drawer footer is not a dense row. */
import { ButtonLink, ButtonSize, Icon } from '../../../../shared/ui';
import { usesPublishWizard } from '../../../publish/path/usesPublishWizard';
import { UnpublishButton } from '../../../publish/UnpublishButton';
import type { Expense } from '../../types';
import { notPublishableReason } from '../../visibility/notPublishableReason';
import './ExpenseRowActions.css';

interface ExpenseRowActionsProps {
  expense: Expense;
  // The task behind the expense's listing, when one exists and has loaded; null keeps the REBID or publish action.
  taskId: string | null;
  // "sm" for the dense list row; the drawer footer passes "md", where these are the panel's own buttons.
  size?: ButtonSize;
  onVisibilityChanged: () => void;
}

/** Render the ineligibility reason, the REBID or publish link, or the task and unpublish controls. */
export function ExpenseRowActions({ expense, taskId, size = 'sm', onVisibilityChanged }: ExpenseRowActionsProps): JSX.Element {
  if (!expense.is_publishable) {
    return (
      <span className="expense-row-actions__ineligible">
        <Icon name="lock" size={14} />
        {notPublishableReason(expense.eligibility_reason)}
      </span>
    );
  }

  const isWizard = usesPublishWizard(expense.category);
  // A REBID-path expense with a task opens it: the task page holds the listing, its offers, acceptance and the money view.
  const openTask = !isWizard && taskId ? (
    <ButtonLink size={size} to={`/tasks/${taskId}`} variant="primary">Open task</ButtonLink>
  ) : null;

  // After acceptance the task page is the only place left to act: bidding is closed, so there is nothing to unpublish.
  if (openTask && expense.task_state === 'accepted') {
    return <span className="expense-row-actions">{openTask}</span>;
  }
  if (expense.visibility === 'public' && expense.listing_id) {
    return (
      <span className="expense-row-actions">
        {openTask ?? <ButtonLink size={size} to={`/listings/${expense.listing_id}/inbox`}>Offers</ButtonLink>}
        <UnpublishButton listingId={expense.listing_id} onUnpublished={onVisibilityChanged} size={size} />
      </span>
    );
  }
  if (openTask) {
    return <span className="expense-row-actions">{openTask}</span>;
  }
  return (
    <span className="expense-row-actions">
      {isWizard ? (
        // The commercial-cleaning scenario's categories keep the wizard, which asks their questions (publish/path).
        <ButtonLink size={size} to={`/publish?expense=${expense.id}`} variant="primary">
          {expense.listing_id ? 'Publish again…' : 'Publish…'}
        </ButtonLink>
      ) : (
        // REBID scopes the expense as requirement rows (roadmap 12), which Ways to save and piece splitting read.
        // No hover title: the list header says what a REBID is, where a keyboard and touch user reads it too.
        <ButtonLink size={size} to={`/tasks/new?expense=${expense.id}`} variant="primary">
          REBID…
        </ButtonLink>
      )}
      {/* An unpublished listing keeps the offers it received while public; the short label fits the row's action track. */}
      {expense.listing_id ? (
        <ButtonLink size={size} title="Offers received while it was public are kept" to={`/listings/${expense.listing_id}/inbox`}>
          Offers
        </ButtonLink>
      ) : null}
    </span>
  );
}
