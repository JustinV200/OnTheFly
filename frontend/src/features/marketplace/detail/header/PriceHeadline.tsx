/* The market's headline figure: what the business pays now, as large as anything on the page, with who published it
   and when. It is the listing's own price, never a figure derived from offers. */
import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../../shared/format/formatTimestamp';
import { cadenceSuffix } from '../../../../shared/market';
import { joinClassNames } from '../../../../shared/ui';
import type { PublicListingProjection } from '../../../publish/types';
import './PriceHeadline.css';

interface PriceHeadlineProps {
  listing: PublicListingProjection;
  className?: string;
}

/** Render the current price with its short period and the published-by caption. */
export function PriceHeadline({ listing, className }: PriceHeadlineProps): JSX.Element {
  return (
    <section aria-label="Current price" className={joinClassNames('price-headline', className)}>
      <p className="price-headline__figure">
        <span className="price-headline__amount">
          <MoneyDisplay amountMinor={listing.price_minor} currency={listing.price_currency} />
        </span>
        {/* The short suffix ("/mo") is for the eye; the spoken form names the full cadence. */}
        <span aria-hidden="true" className="price-headline__period">{cadenceSuffix(listing.billing_cadence)}</span>
        <span className="ui-visually-hidden"> billed {listing.billing_cadence}</span>
      </p>
      <p className="price-headline__caption">
        Current price, published by the business{listing.published_at ? ` on ${formatTimestamp(listing.published_at)}` : ''}
      </p>
    </section>
  );
}
