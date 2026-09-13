/* One line under the price fields saying where their starting values came from: the market page's bid ticket, the
   challenger's current offer, or neither because the ticket couldn't be read. Never a silent prefill. */
import { Icon } from '../../../shared/ui';
import type { TicketOrigin } from './seedOfferFields';
import './BidTicketNote.css';

interface BidTicketNoteProps {
  origin: TicketOrigin;
}

/** Render the note, or nothing when no ticket was handed over. */
export function BidTicketNote({ origin }: BidTicketNoteProps): JSX.Element | null {
  const unreadable = [origin.hasUnreadablePrice ? 'price' : null, origin.hasUnreadableBilling ? 'billing period' : null].filter(Boolean);
  const fromTicket = describeFromTicket(origin);
  if (!fromTicket && unreadable.length === 0) {
    return null;
  }

  return (
    <div className="bid-ticket-note">
      {fromTicket ? (
        <p className="bid-ticket-note__line">
          <Icon name="check" size={14} />
          <span>
            {fromTicket} from your bid ticket
            {origin.isOverStoredOffer ? ' — your other terms are from your current offer.' : '. Check it, then confirm what’s covered.'}
          </span>
        </p>
      ) : null}
      {unreadable.length > 0 ? (
        <p className="bid-ticket-note__line bid-ticket-note__line--warning" role="status">
          <Icon name="alert-triangle" size={14} />
          <span>Your bid ticket’s {unreadable.join(' and ')} couldn’t be read, so {unreadable.length === 1 ? 'it wasn’t' : 'they weren’t'} filled in.</span>
        </p>
      ) : null}
    </div>
  );
}

function describeFromTicket(origin: TicketOrigin): string | null {
  if (origin.isPriceFromTicket && origin.isBillingFromTicket) {
    return 'Price and billing period';
  }
  if (origin.isPriceFromTicket) {
    return 'Price';
  }
  return origin.isBillingFromTicket ? 'Billing period' : null;
}
