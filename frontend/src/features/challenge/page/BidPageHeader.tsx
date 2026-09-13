/* The bid page's header once the listing has loaded: back to the market page, the market being bid on, and the terms a
   challenger reads before any field (bidding mode, time left, current price), all from the public listing projection. */
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

/** Render the page header with its h1 and the listing's status badges. */
export function BidPageHeader({ listing }: BidPageHeaderProps): JSX.Element {
  const closes = describeClosesIn(listing.challenge_deadline);

  return (
    <PageHeader
      eyebrow={<Link to={`/listings/${listing.id}`}>← Back to the market</Link>}
      meta={(
        <>
          <BiddingModePill mode={listing.bidding_mode} />
          <Badge icon={<Icon name="clock" />} title={closes.exact ?? undefined} tone={closes.isClosed ? 'danger' : 'neutral'}>{closes.label}</Badge>
          <Badge tone="neutral">
            {listing.price_minor === null ? 'Price not disclosed' : <>Listed at <ListedPrice amountMinor={listing.price_minor} currency={listing.price_currency} /> {cadenceSuffix(listing.billing_cadence)}</>}
          </Badge>
        </>
      )}
      subtitle={listing.service_area_approximate || 'Area not specified'}
      title={`Bid on ${listing.title || categoryLabel(listing.category)}`}
    />
  );
}
