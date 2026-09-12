/* Renders one public listing card on a business profile page.
   It consumes the additive public projection exactly as the API returns it. */
import { Link } from 'react-router-dom';

import { BiddingModePill } from '../../shared/components/BiddingModePill';
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { categoryLabel } from '../../shared/format/categoryLabel';
import { describeDeadline } from '../../shared/format/describeDeadline';
import { formatTimestamp } from '../../shared/format/formatTimestamp';
import type { PublicListingProjection } from '../publish/types';

interface PublicListingCardProps {
  listing: PublicListingProjection;
}

/** Render one public listing summary card from the public profile API. */
export function PublicListingCard({ listing }: PublicListingCardProps): JSX.Element {
  return (
    <article style={{ border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '1rem', padding: '1rem' }}>
      <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>{categoryLabel(listing.category)}</h3>
        <BiddingModePill mode={listing.bidding_mode} />
      </div>
      <p style={{ fontSize: '1.25rem', margin: '0.5rem 0 0.25rem' }}>
        <MoneyDisplay amountMinor={listing.price_minor} currency={listing.price_currency} /> / {listing.billing_cadence}
      </p>
      <p style={{ margin: '0 0 0.25rem' }}>{listing.scope_summary}</p>
      <p style={{ color: '#475569', margin: '0 0 0.5rem' }}>
        {describeDeadline(listing.challenge_deadline).text}
        {listing.published_at ? ` · published ${formatTimestamp(listing.published_at)}` : ''}
      </p>
      <Link to={`/listings/${listing.id}`}>View listing and offers</Link>
    </article>
  );
}
