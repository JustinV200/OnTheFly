/* The market page's sticky bid ticket. It always states the bidding terms and the deadline first, then gives this
   viewer their one action: a bid form, "Offers" for the poster (who can never bid on their own listing), a
   closed notice, or how a public visitor can bid. A bidder reads what becomes public before any button
   (CLAUDE.md, "Marketplace mechanics"). */
import { ErrorState } from '../../../../shared/components/ErrorState';
import type { ClosesIn } from '../../../../shared/market';
import { Card, Icon, Skeleton, Stack } from '../../../../shared/ui';
import type { PublicListingProjection } from '../../../publish/types';
import { BidForm } from './form/BidForm';
import { OwnerTicketActions } from './OwnerTicketActions';
import type { ListingOwnership } from './useListingOwnership';
import './BidTicket.css';

interface BidTicketProps {
  listing: PublicListingProjection;
  closes: ClosesIn;
  ownership: ListingOwnership;
  // The public offer count, used only to number the poster's Offers button; it says nothing about prices.
  offerCount: number;
}

/** Render the ticket for the acting viewer. */
export function BidTicket({ listing, closes, ownership, offerCount }: BidTicketProps): JSX.Element {
  // Anything but an explicit "open" is sealed, the same safe fallback BiddingModePill uses.
  const isOpen = listing.bidding_mode === 'open';
  const isOwner = ownership.status === 'owner';

  return (
    <Card className="bid-ticket" title={isOwner ? 'Your listing' : 'Bid on this task'}>
      <Stack gap={4}>
        <div className="bid-ticket__terms">
          <TermRow icon={isOpen ? 'eye' : 'lock'} title={isOpen ? 'Open bidding' : 'Sealed bidding'}>
            {termsSentence(isOpen, isOwner)}
          </TermRow>
          <TermRow icon="clock" title={closes.label}>
            {closes.exact ? (closes.isClosed ? `Since ${closes.exact}` : `Until ${closes.exact}`) : 'No deadline set. Offers are accepted while the market is public.'}
          </TermRow>
        </div>

        <TicketAction closes={closes} listing={listing} offerCount={offerCount} ownership={ownership} />
      </Stack>
    </Card>
  );
}

function TicketAction({ listing, closes, ownership, offerCount }: BidTicketProps): JSX.Element {
  if (ownership.status === 'owner') {
    return <OwnerTicketActions isClosed={closes.isClosed} listingId={listing.id} offerCount={offerCount} taskId={ownership.taskId} />;
  }
  if (closes.isClosed) {
    return <p className="bid-ticket__message">This task is closed to new offers. Offers made before the deadline still count.</p>;
  }
  if (ownership.status === 'visitor') {
    return (
      <p className="bid-ticket__message">
        Offers come from a business. Choose one from the business switcher in the top bar to bid; you can read everything here without one.
      </p>
    );
  }
  if (ownership.status === 'checking') {
    return (
      <div aria-busy="true" className="bid-ticket__checking" role="status">
        <span className="ui-text-muted ui-text-sm">Checking whether this is your listing…</span>
        <Skeleton height="46px" shape="block" />
      </div>
    );
  }
  if (ownership.status === 'unknown') {
    // No bid form without an answer: offering one to the owner would invite a bid the platform must refuse.
    return <ErrorState error={ownership.error} onRetry={ownership.retry} title="Couldn’t check whether this is your listing" />;
  }
  return <BidForm listingCadence={listing.billing_cadence} listingId={listing.id} />;
}

function TermRow({ icon, title, children }: { icon: 'eye' | 'lock' | 'clock'; title: string; children: string }): JSX.Element {
  return (
    <div className="bid-ticket__term">
      <span aria-hidden="true" className="bid-ticket__term-icon">
        <Icon name={icon} size={16} />
      </span>
      <div className="bid-ticket__term-text">
        <p className="bid-ticket__term-title">{title}</p>
        <p className="bid-ticket__term-detail">{children}</p>
      </div>
    </div>
  );
}

function termsSentence(isOpen: boolean, isOwner: boolean): string {
  if (isOwner) {
    return isOpen
      ? 'Offer prices and scope are public. Who made each offer never is.'
      : 'Only you see offer prices. The public sees how many offers there are.';
  }
  return isOpen
    ? 'Your price and scope are visible to other bidders. Your identity never is.'
    : 'Only the business sees your price. Your identity is never shown to other bidders.';
}
