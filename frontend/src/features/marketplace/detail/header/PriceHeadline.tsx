/* The market's headline figure: the price the business listed, as large as anything on the page, with who published it
   and when. It is the listing's own price, never a figure derived from offers. When the poster kept the price private
   (the default for new tasks and pieces), the headline says so instead of showing a number. */
import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../../shared/format/formatTimestamp';
import { cadenceSuffix, describeBilling } from '../../../../shared/market';
import { joinClassNames } from '../../../../shared/ui';
import type { PublicListingProjection } from '../../../publish/types';
import './PriceHeadline.css';

interface PriceHeadlineProps {
  listing: PublicListingProjection;
  className?: string;
}

/** Render the listed price with its short period and the published-by caption. */
export function PriceHeadline({ listing, className }: PriceHeadlineProps): JSX.Element {
  const published = listing.published_at ? ` on ${formatTimestamp(listing.published_at)}` : '';
  if (listing.price_minor === null) {
    return (
      <section aria-label="Listed price" className={joinClassNames('price-headline', className)}>
        <p className="price-headline__figure">
          <span className="price-headline__undisclosed">Price not disclosed</span>
        </p>
        <p className="price-headline__caption">
          The business kept its price private. Offers are {describeBilling(listing.billing_cadence)}; published{published}.
        </p>
      </section>
    );
  }
  return (
    <section aria-label="Current price" className={joinClassNames('price-headline', className)}>
      <p className="price-headline__figure">
        <span className="price-headline__amount">
          <MoneyDisplay amountMinor={listing.price_minor} currency={listing.price_currency} />
        </span>
        {/* The short suffix ("/mo") is for the eye; the spoken form names the full cadence. */}
        <span aria-hidden="true" className="price-headline__period">{cadenceSuffix(listing.billing_cadence)}</span>
        <span className="ui-visually-hidden"> {describeBilling(listing.billing_cadence)}</span>
      </p>
      <p className="price-headline__caption">
        {listing.expense_id ? 'Current price' : 'Listed price'}, published by the business{published}
      </p>
    </section>
  );
}
