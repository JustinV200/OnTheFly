/* States the bidding terms an offer will be submitted under, directly above the price field.
   A resubmission is a revision, and the server records it under the mode in force now, not the old offer's.
   After a mode change it also carries the confirm action, since on a phone the page's alert has scrolled out of view. */
import { Button, Callout } from '../../../shared/ui';
import { describeModeChange } from '../status/describeModeChange';
import type { BiddingModeValue } from '../types';

// The in-page anchor the submit area links to while the terms await confirmation.
export const BIDDING_TERMS_ANCHOR = 'challenge-bidding-terms';

interface BiddingTermsCalloutProps {
  // null while a mode change awaits re-confirmation: the terms are then unacknowledged and submitting is blocked.
  acknowledgedMode: BiddingModeValue | null;
  // The listing's mode now; it differs from what the challenger acknowledged exactly when acknowledgedMode is null.
  currentMode: BiddingModeValue;
  onConfirmMode: () => void;
  // True when the form revises a stored offer rather than making a first one.
  isRevision: boolean;
}

/** Render the open, sealed, or changed-terms note that a challenger reads before typing a price. */
export function BiddingTermsCallout({ acknowledgedMode, currentMode, onConfirmMode, isRevision }: BiddingTermsCalloutProps): JSX.Element {
  const replacement = isRevision
    ? 'Submitting replaces your current offer with this revision.'
    : 'If you already have an offer on this listing, this one replaces it.';

  if (acknowledgedMode === null) {
    return (
      <div id={BIDDING_TERMS_ANCHOR}>
        <Callout
          actions={<Button onClick={onConfirmMode}>I’ve read the new terms: continue with {currentMode} bidding</Button>}
          role="note"
          title={`The bidding terms changed to ${currentMode}`}
          tone="warning"
        >
          <p>{describeModeChange(currentMode)} Confirm the new terms before submitting; what you typed here is kept. {replacement}</p>
        </Callout>
      </div>
    );
  }
  if (acknowledgedMode === 'open') {
    return (
      <Callout icon="eye" role="note" title="Open bidding" tone="info">
        <p>Your price and scope will be visible to other challengers. Your identity will not. {replacement}</p>
      </Callout>
    );
  }
  return (
    <Callout role="note" title="Sealed bidding" tone="private">
      <p>Only the listing owner sees your price. Your identity is never shown to other challengers. {replacement}</p>
    </Callout>
  );
}
