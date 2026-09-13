/* What an owner sees on the bid page for their own listing: no form, and the two things they can do instead. */
import { EmptyState } from '../../../shared/components/EmptyState';
import { ButtonLink } from '../../../shared/ui';

interface OwnListingNoticeProps {
  listingId: string;
}

/** Render the owner's empty state with Manage offers and View the listing. */
export function OwnListingNotice({ listingId }: OwnListingNoticeProps): JSX.Element {
  return (
    <EmptyState
      action={(
        <>
          <ButtonLink to={`/listings/${listingId}/inbox`} variant="primary">Manage offers</ButtonLink>
          <ButtonLink to={`/listings/${listingId}`}>View the listing</ButtonLink>
        </>
      )}
      title="This is your own listing"
    >
      A business can’t bid on its own listing. Offers from other businesses arrive in your offers inbox.
    </EmptyState>
  );
}
