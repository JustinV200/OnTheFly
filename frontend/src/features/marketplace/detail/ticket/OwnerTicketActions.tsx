/* What the ticket offers the business that published the listing: no bid form (an owner can't bid on their own
   listing), but the two things an owner comes here to do next. */
import { ButtonLink, Stack } from '../../../../shared/ui';
import './BidTicket.css';

interface OwnerTicketActionsProps {
  listingId: string;
  isClosed: boolean;
}

/** Render the owner's note and the Manage offers / Invite suppliers links. */
export function OwnerTicketActions({ listingId, isClosed }: OwnerTicketActionsProps): JSX.Element {
  return (
    <Stack gap={3}>
      <p className="bid-ticket__message">
        <strong>This is your listing.</strong> You can’t bid on it{isClosed ? ', and it is closed to new offers' : ''}. Review
        what bidders offered, or invite suppliers to bid.
      </p>
      <ButtonLink isFullWidth size="lg" to={`/listings/${listingId}/inbox`} variant="primary">Manage offers</ButtonLink>
      <ButtonLink isFullWidth to={`/listings/${listingId}/invite`}>Invite suppliers</ButtonLink>
    </Stack>
  );
}
