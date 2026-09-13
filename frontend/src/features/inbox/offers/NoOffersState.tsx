/* What the Offers page shows before the first offer: a normal, expected state with the next step, not a blank list.
   A public listing is nudged to share its link or invite suppliers; a private one can only be published again, since
   nobody can bid on a listing they can't see. */
import { EmptyState } from '../../../shared/components/EmptyState';
import { ButtonLink, Cluster, CopyButton, Icon } from '../../../shared/ui';
import type { PublicListingProjection } from '../../publish/types';

/** Render the empty state for a listing with no offers. */
export function NoOffersState({ listing }: { listing: PublicListingProjection }): JSX.Element {
  const publicPath = `/listings/${listing.id}`;
  if (listing.visibility !== 'public') {
    return (
      <EmptyState action={<ButtonLink to={`/publish?expense=${listing.expense_id}`}>Publish again…</ButtonLink>} title="No offers">
        No offers arrived while this listing was public. It is private now, so nobody can bid on it.
      </EmptyState>
    );
  }
  return (
    <EmptyState
      action={(
        <Cluster gap={2}>
          <ButtonLink iconStart={<Icon name="mail" size={15} />} to={`${publicPath}/invite`} variant="primary">Invite suppliers</ButtonLink>
          <CopyButton label="Copy listing link" value={`${window.location.origin}${publicPath}`} />
          <ButtonLink iconStart={<Icon name="eye" size={15} />} to={publicPath} variant="ghost">View as a stranger</ButtonLink>
        </Cluster>
      )}
      title="No offers yet"
    >
      Your listing is live, and strangers see “no offers yet” until someone bids. Most listings start this way: share the link or
      invite suppliers to get the first offer. It will appear here, ranked against what you pay now, without a refresh.
    </EmptyState>
  );
}
