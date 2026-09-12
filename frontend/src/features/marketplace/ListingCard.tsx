/* Renders one listing summary card in the public marketplace feed.
   The card uses only the stored public projection returned by the backend. */
import { Link } from 'react-router-dom';

import { BiddingModePill } from '../../shared/components/BiddingModePill';
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { categoryLabel } from '../../shared/format/categoryLabel';
import { describeDeadline } from '../../shared/format/describeDeadline';
import type { MarketplaceListing } from './types';

interface ListingCardProps {
  item: MarketplaceListing;
}

/** Render one marketplace listing summary with browse and challenge links. */
export function ListingCard({ item }: ListingCardProps): JSX.Element {
  const { listing } = item;
  const deadline = describeDeadline(listing.challenge_deadline);

  return (
    <article style={{ border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '1rem', padding: '1rem' }}>
      <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>{categoryLabel(listing.category)} · {listing.service_area_approximate || 'area not specified'}</h3>
        <BiddingModePill mode={listing.bidding_mode} />
      </div>
      <p style={{ fontSize: '1.25rem', margin: '0.5rem 0 0.25rem' }}>
        Pays <MoneyDisplay amountMinor={listing.price_minor} currency={listing.price_currency} /> / {listing.billing_cadence}
        <span style={{ color: '#475569', fontSize: '0.85rem' }}> (price published by the business)</span>
      </p>
      <p style={{ margin: '0 0 0.25rem' }}>{listing.scope_summary}</p>
      <p style={{ color: deadline.isClosed ? '#991b1b' : '#475569', margin: '0 0 0.5rem' }}>
        {deadline.text} · {offerCountText(item.challenge_count)}
      </p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <Link to={`/listings/${listing.id}`}>View listing</Link>
        {deadline.isClosed ? null : <Link to={`/listings/${listing.id}/challenge`}>Challenge this price</Link>}
      </div>
    </article>
  );
}

function offerCountText(count: number): string {
  if (count === 0) {
    return 'no offers yet';
  }
  return count === 1 ? '1 offer so far' : `${count} offers so far`;
}
