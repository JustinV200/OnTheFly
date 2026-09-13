/* Stops a challenger submitting under terms they haven't seen: the owner changed the bidding mode mid-draft.
   Nothing is submitted and the draft is kept; the challenger reads the new terms and confirms before the form will submit. */
import { Button, Callout } from '../../../shared/ui';
import type { BiddingModeValue } from '../types';
import { describeModeChange } from './describeModeChange';

interface ModeChangeAlertProps {
  // The mode the challenger acknowledged when the form opened.
  shownMode: BiddingModeValue;
  // The listing's mode now, which differs from shownMode while this alert is up.
  currentMode: BiddingModeValue;
  onConfirm: () => void;
}

/** Render the re-confirmation alert for a bidding-mode change made while the challenger was writing. */
export function ModeChangeAlert({ shownMode, currentMode, onConfirm }: ModeChangeAlertProps): JSX.Element {
  return (
    <Callout
      actions={<Button onClick={onConfirm}>I’ve read the new terms: continue with {currentMode} bidding</Button>}
      role="alert"
      title={`The owner changed bidding from ${shownMode} to ${currentMode} while you were writing.`}
      tone="warning"
    >
      <p>
        {describeModeChange(currentMode)} Nothing has been submitted. What you typed in the form is kept; review it under the new
        terms, then confirm to submit.
      </p>
    </Callout>
  );
}
