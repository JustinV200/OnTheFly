/* The offer panel for sealed bidding: how many offers exist, and a plain statement that their prices are private.
   It never shows a price, a range or a trend, not even "lowest". */
import { Icon } from '../../../../shared/ui';
import './OfferActivity.css';

interface SealedOffersPanelProps {
  offerCount: number;
}

/** Render the lock, the offer count and the sealed-bidding sentence. */
export function SealedOffersPanel({ offerCount }: SealedOffersPanelProps): JSX.Element {
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
