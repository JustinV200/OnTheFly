/* The offer panel for sealed bidding: how many offers exist, and a plain statement that their prices are private.
   It never shows a price, a range or a trend, not even "lowest".
   With no offers yet there is nothing to weigh, so it is one compact line rather than a panel; the boxed panel is kept
   for the case where offers exist and the count is worth noticing. */
import { Icon } from '../../../../shared/ui';
import './OfferActivity.css';

interface SealedOffersPanelProps {
  offerCount: number;
}

/** Render the sealed-bidding state: one line with no offers, the lock panel with the count once there are any. */
export function SealedOffersPanel({ offerCount }: SealedOffersPanelProps): JSX.Element {
  if (offerCount === 0) {
    return <p className="sealed-offers__line">Sealed bidding · no offers yet · only the business sees offer prices</p>;
  }

  return (
    <div className="sealed-offers">
      <span aria-hidden="true" className="sealed-offers__icon">
        <Icon name="lock" size={22} />
      </span>
      <div>
        <p className="sealed-offers__title">
          Sealed bidding · {offerCount === 1 ? '1 offer' : `${offerCount} offers`}
        </p>
        <p className="sealed-offers__text">Only the business sees offer prices.</p>
      </div>
    </div>
  );
}
