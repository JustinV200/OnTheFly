/* Renders one listing summary card in the public marketplace feed.
   The card uses only the stored public projection returned by the backend. */
import { Link } from 'react-router-dom';

import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import type { MarketplaceListing } from './types';

interface ListingCardProps {
  item: MarketplaceListing;
}

/** Render one marketplace listing summary with browse and challenge links. */
export function ListingCard({ item }: ListingCardProps): JSX.Element {
  return (
    <article style={{ border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '1rem', padding: '1rem' }}>
      <h3 style={{ marginTop: 0 }}>{item.listing.category}</h3>
      <p>{item.listing.scope_summary}</p>
      <p><MoneyDisplay amountMinor={item.listing.price_minor} currency={item.listing.price_currency} /> / {item.listing.billing_cadence}</p>
      <p>{item.challenge_count} challenges</p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <Link to={`/listings/${item.listing.id}`}>View listing</Link>
        <Link to={`/listings/${item.listing.id}/challenge`}>Challenge</Link>
      </div>
    </article>
  );
}
