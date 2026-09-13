/* The alert at the top of the bid form when the business changes the bidding mode while the bidder is still typing.
   The steady-state mode is not explained here (the header pill and the summary beside the submit button do that once);
   this renders only for a change, with the confirm action, since a revision is recorded under the mode in force now.
   The summary card repeats the warning and its confirm button beside the submit button. */
import { Button, Callout } from '../../../shared/ui';
import { describeModeChange } from '../status/describeModeChange';
import type { BiddingModeValue } from '../types';

interface ModeChangeAlertProps {
  // null while a mode change awaits re-confirmation: the terms are then unacknowledged and submitting is blocked.
  acknowledgedMode: BiddingModeValue | null;
  // The listing's mode now; it differs from what the bidder acknowledged exactly when acknowledgedMode is null.
  currentMode: BiddingModeValue;
  onConfirmMode: () => void;
  // True when the form revises a stored offer rather than making a first one.
  isRevision: boolean;
}

/** Render the changed-terms alert, or nothing while the acknowledged mode is still the one in force. */
export function ModeChangeAlert({ acknowledgedMode, currentMode, onConfirmMode, isRevision }: ModeChangeAlertProps): JSX.Element | null {
  if (acknowledgedMode !== null) {
    return null;
  }
  const replacement = isRevision
    ? 'Submitting replaces your current offer with this revision.'
    : 'If you already have an offer on this listing, this one replaces it.';

  return (
    <Callout
      actions={<Button onClick={onConfirmMode}>I’ve read the new terms: continue with {currentMode} bidding</Button>}
      // An alert, so the change is announced while the bidder is still typing (the page polls for it).
      role="alert"
      title={`The business changed bidding to ${currentMode} while you were writing`}
      tone="warning"
    >
      <p>{describeModeChange(currentMode)} Confirm the new terms before submitting; what you typed here is kept. {replacement}</p>
    </Callout>
  );
}
