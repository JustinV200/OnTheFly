/* States a listing's bidding terms and deadline, then offers the challenge action, in that order.
   A challenger reads what will become public before the button, never after (CLAUDE.md, "Marketplace mechanics"). */
import type { DeadlineDescription } from '../../../shared/format/describeDeadline';
import { ButtonLink, Callout, Card, Stack } from '../../../shared/ui';
import type { PublicListingProjection } from '../../publish/types';

interface ChallengePanelProps {
  listing: PublicListingProjection;
  deadline: DeadlineDescription;
}

/** Render the bidding-terms callout, the deadline, and "Challenge this price" (or a closed notice after the deadline). */
export function ChallengePanel({ listing, deadline }: ChallengePanelProps): JSX.Element {
  // Anything but an explicit "open" is sealed, the safe fallback BiddingModePill also uses.
  const isOpen = listing.bidding_mode === 'open';

  return (
    <Card as="aside" title="Bidding terms">
      <Stack gap={4}>
        <Callout role="note" title={isOpen ? 'Open bidding' : 'Sealed bidding'} tone={isOpen ? 'info' : 'private'}>
          <p>
            {isOpen
              ? 'Your price and scope will be visible to other challengers. Your identity will not.'
              : 'Only the offer count is public. Your price stays with the owner, and your identity is never shown to other challengers.'}
          </p>
        </Callout>
        {deadline.isClosed ? (
          <Callout role="note" title="Closed to new offers" tone="neutral">
            <p>{deadline.text}. Offers already made still count.</p>
          </Callout>
        ) : (
          <>
            <p className="ui-text-sm">{deadline.text}.</p>
            <ButtonLink isFullWidth size="lg" to={`/listings/${listing.id}/challenge`} variant="primary">
              Challenge this price
            </ButtonLink>
          </>
        )}
      </Stack>
    </Card>
  );
}
