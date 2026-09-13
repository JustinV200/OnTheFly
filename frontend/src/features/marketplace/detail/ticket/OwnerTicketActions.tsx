/* What the ticket offers the business that published the listing: no bid form (a poster can't bid on its own
   listing), but the things a poster comes here to do next: open its task, manage offers, invite suppliers. */
import { ButtonLink, Stack } from '../../../../shared/ui';
import './BidTicket.css';

interface OwnerTicketActionsProps {
  listingId: string;
  // The task behind the listing, known only to its poster; null for a listing from before tasks.
  taskId: string | null;
  isClosed: boolean;
}

/** Render the poster's note and its task, offers and invitation links. */
export function OwnerTicketActions({ listingId, taskId, isClosed }: OwnerTicketActionsProps): JSX.Element {
  return (
    <Stack gap={3}>
      <p className="bid-ticket__message">
        <strong>This is your listing.</strong> You can’t bid on it{isClosed ? ', and it is closed to new offers' : ''}. Review
        what bidders offered, or invite suppliers to bid.
      </p>
      <ButtonLink isFullWidth size="lg" to={`/listings/${listingId}/inbox`} variant="primary">Manage offers</ButtonLink>
      {taskId ? <ButtonLink isFullWidth to={`/tasks/${taskId}`}>Open your task</ButtonLink> : null}
      <ButtonLink isFullWidth to={`/listings/${listingId}/invite`}>Invite suppliers</ButtonLink>
    </Stack>
  );
}
