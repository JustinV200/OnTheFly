/* The bid page's header once the listing has loaded. The h1 is the constant "Your offer" (the same one BidPageFrame
   renders while the page loads, so the heading never changes under the reader); which market is being bid on moves to
   the subtitle, where it links back to the market page. The terms a bidder reads before any field (bidding mode, time
   left, current price) sit in the meta row, all from the public listing projection. */
import { Link } from 'react-router-dom';

import { BiddingModePill } from '../../../shared/components/BiddingModePill';
import { ListedPrice } from '../../../shared/components/ListedPrice';
import { categoryLabel } from '../../../shared/format/categoryLabel';
import { cadenceSuffix, describeClosesIn } from '../../../shared/market';
import { Badge, Icon, PageHeader } from '../../../shared/ui';
import type { PublicListingProjection } from '../../publish/types';

interface BidPageHeaderProps {
  listing: PublicListingProjection;
}

/** Render the page header with its h1, the market it belongs to, and the listing's status badges. */
export function BidPageHeader({ listing }: BidPageHeaderProps): JSX.Element {
  const closes = describeClosesIn(listing.challenge_deadline);
  const marketName = listing.title || categoryLabel(listing.category);

  return (
    <PageHeader
      eyebrow={<Link to="/marketplace">← Markets</Link>}
      meta={(
        <>
          <BiddingModePill mode={listing.bidding_mode} />
          <Badge icon={<Icon name="clock" />} title={closes.exact ?? undefined} tone={closes.isClosed ? 'danger' : 'neutral'}>{closes.label}</Badge>
          <Badge tone="neutral">
            {listing.price_minor === null ? 'Price not disclosed' : <>Listed at <ListedPrice amountMinor={listing.price_minor} currency={listing.price_currency} /> {cadenceSuffix(listing.billing_cadence)}</>}
          </Badge>
        </>
      )}
      subtitle={(
        <>
          {/* The link is the way back to the scope and rules this offer answers, so it stays one tap away. */}
          <Link to={`/listings/${listing.id}`}>{marketName}</Link>
          {' · '}
          {listing.service_area_approximate || 'Area not specified'}
        </>
      )}
      title="Your offer"
    />
  );
}
