/* What the bidding mode means for this offer, right above the submit button. While a mode change awaits re-confirmation
   it becomes the warning with the confirm action, since on a long form this card is where the challenger is looking. */
import { Button, Callout } from '../../../shared/ui';
import { describeModeChange } from '../status/describeModeChange';
import type { BiddingModeValue } from '../types';

interface ModeMeaningProps {
  // null while the owner's mode change hasn't been re-confirmed.
  acknowledgedMode: BiddingModeValue | null;
  currentMode: BiddingModeValue;
  onConfirmMode: () => void;
}

/** Render the sealed or open consequence, or the changed-terms warning with its confirm button. */
export function ModeMeaning({ acknowledgedMode, currentMode, onConfirmMode }: ModeMeaningProps): JSX.Element {
  if (acknowledgedMode === null) {
    return (
      <Callout
        actions={<Button onClick={onConfirmMode} size="sm">Continue with {currentMode} bidding</Button>}
        role="note"
        title={`Bidding changed to ${currentMode}`}
        tone="warning"
      >
        <p>{describeModeChange(currentMode)} Nothing has been submitted.</p>
      </Callout>
    );
  }
  if (acknowledgedMode === 'open') {
    return (
      <Callout icon="eye" role="note" title="Open bidding" tone="info">
        <p>Your price and scope appear on the public leaderboard, without your name. The owner sees who you are.</p>
      </Callout>
    );
  }
  return (
    <Callout role="note" title="Sealed bidding" tone="private">
      <p>Only the owner sees your price and scope. The public sees how many offers there are, never yours or your name.</p>
    </Callout>
  );
}
