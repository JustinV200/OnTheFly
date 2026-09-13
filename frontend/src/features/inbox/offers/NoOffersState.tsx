/* What the Offers page shows before the first offer: a normal, expected state with the next step, not a blank list.
   A public listing is pointed at the share buttons already in the controls band above (not repeated here); a private one
   can only be published again, from its task or the older wizard, since nobody can bid on a listing they can't see. */
import { EmptyState } from '../../../shared/components/EmptyState';
import type { PublicListingProjection } from '../../publish/types';
import { RepublishLink } from '../controls/RepublishLink';
import type { InboxTaskSummary } from '../types';

interface NoOffersStateProps {
  listing: PublicListingProjection;
  task: InboxTaskSummary | null;
}

/** Render the empty state for a listing with no offers. */
export function NoOffersState({ listing, task }: NoOffersStateProps): JSX.Element {
  if (listing.visibility !== 'public') {
    return (
      <EmptyState action={<RepublishLink listing={listing} task={task} />} title="No offers">
        No offers arrived while this listing was public. It is private now, so nobody can bid on it.
      </EmptyState>
    );
  }
  return (
    <EmptyState title="No offers yet">
      Your listing is live, and strangers see “no offers yet” until someone bids. Most listings start this way: copy the link or
      invite suppliers from the controls above to get the first offer. It will appear here, ranked against what you pay now,
      without a refresh.
    </EmptyState>
  );
}
