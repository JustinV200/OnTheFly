/* What the ticket offers the business that posted the listing: no bid form (a poster can't bid on its own listing),
   one primary action (Offers), and the poster's other two destinations as small secondary actions beneath it, so the
   ticket has a single obvious next step rather than three equal buttons. */
import { ButtonLink, Cluster, Stack } from '../../../../shared/ui';
import './BidTicket.css';

interface OwnerTicketActionsProps {
  listingId: string;
  // The task behind the listing, known only to its poster; null for a listing from before tasks.
  taskId: string | null;
  isClosed: boolean;
  // The public offer count, shown on the Offers button so the poster knows whether there is anything to review.
  offerCount: number;
}

/** Render the poster's note, the Offers button, and its task and invitation links. */
export function OwnerTicketActions({ listingId, taskId, isClosed, offerCount }: OwnerTicketActionsProps): JSX.Element {
  return (
    <Stack gap={3}>
      <p className="bid-ticket__message">
        <strong>This is your listing.</strong> You can’t bid on it{isClosed ? ', and it is closed to new offers' : ''}. Review
        what bidders offered, or invite suppliers to bid.
      </p>
      <ButtonLink isFullWidth size="lg" to={`/listings/${listingId}/inbox`} variant="primary">Offers ({offerCount})</ButtonLink>
      <Cluster gap={2}>
        {taskId ? <ButtonLink size="sm" to={`/tasks/${taskId}`} variant="ghost">Open your task</ButtonLink> : null}
        <ButtonLink size="sm" to={`/listings/${listingId}/invite`} variant="ghost">Invite suppliers</ButtonLink>
      </Cluster>
    </Stack>
  );
}
