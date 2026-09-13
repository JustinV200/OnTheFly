/* One offer's price as its bidder submitted it, with the bidder's own period ("$1,298,000.00 /yr"), from the owner's
   offers endpoint. The frontend never converts between periods: until the submitted terms load (or if an offer is
   missing from them), the server's monthly-normalized figure shows, labeled "compared per month" so it can't be
   misread as the listing's yearly price. */
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { cadenceSuffix } from '../../../shared/market';
import type { InboxChallenge, OwnerChallenge } from '../../inbox/types';

interface OfferPriceProps {
  offer: InboxChallenge;
  submitted: OwnerChallenge | undefined;
}

/** Render the submitted price, or the labeled normalized fallback. */
export function OfferPrice({ offer, submitted }: OfferPriceProps): JSX.Element {
  if (submitted) {
    return (
      <span className="offers-to-accept__price">
        <MoneyDisplay amountMinor={submitted.price_minor} currency={submitted.price_currency} /> {cadenceSuffix(submitted.billing_frequency)}
      </span>
    );
  }
  return (
    <span className="offers-to-accept__price">
      <MoneyDisplay amountMinor={offer.normalized_price_minor} currency={offer.price_currency} /> /mo
      <span className="offers-to-accept__normalized"> compared per month</span>
    </span>
  );
}
