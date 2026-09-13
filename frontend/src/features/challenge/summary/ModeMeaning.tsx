/* The bid page's one explanation of the bidding mode, right above the submit button, where the bidder decides. The mode
   itself is named by the card's pill and the submit label; this says in one sentence what it means for this offer. While
   a mode change awaits re-confirmation it becomes a warning that points at ModeChangeAlert's confirm button: the one
   confirm action for a change lives at the top of the form, so the same decision isn't offered twice. */
import { Callout } from '../../../shared/ui';
import { describeModeChange } from '../status/describeModeChange';
import type { BiddingModeValue } from '../types';

interface ModeMeaningProps {
  // null while the business's mode change hasn't been re-confirmed.
  acknowledgedMode: BiddingModeValue | null;
  currentMode: BiddingModeValue;
}

/** Render the sealed or open consequence, or the changed-terms warning pointing at the alert's confirm button. */
export function ModeMeaning({ acknowledgedMode, currentMode }: ModeMeaningProps): JSX.Element {
  if (acknowledgedMode === null) {
    return (
      <Callout role="note" title={`Bidding changed to ${currentMode}`} tone="warning">
        <p>{describeModeChange(currentMode)} Nothing has been submitted. Confirm the new terms above to submit.</p>
      </Callout>
    );
  }
  if (acknowledgedMode === 'open') {
    return (
      <Callout icon="eye" role="note" tone="info">
        <p>Open bidding: your price and scope appear publicly, without your name. Only the business sees who you are.</p>
      </Callout>
    );
  }
  return (
    <Callout role="note" tone="private">
      <p>Sealed bidding: only the business sees your price and who you are. Everyone else sees only how many offers there are.</p>
    </Callout>
  );
}
