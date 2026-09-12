/* Shows a single marketplace listing by reading the public feed payload.
   This keeps the early browse experience simple while the API surface grows. */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { get } from '../../shared/api/client';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import type { MarketplaceFeedResponse, MarketplaceListing } from './types';

/** Render one public listing detail page from the marketplace feed. */
export function ListingDetailPage(): JSX.Element {
  const { id = '' } = useParams();
  const [item, setItem] = useState<MarketplaceListing | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await get<MarketplaceFeedResponse>('/api/marketplace');
      setItem(response.listings.find((listing) => listing.listing.id === id) ?? null);
    })();
  }, [id]);

  if (!item) {
    return <LoadingSpinner />;
  }

  return (
    <section>
      <h2>{item.listing.category}</h2>
      <p>{item.listing.scope_summary}</p>
      <p><MoneyDisplay amountMinor={item.listing.price_minor} currency={item.listing.price_currency} /> / {item.listing.billing_cadence}</p>
      <p>Bidding mode: {item.listing.bidding_mode}</p>
      <p>{item.challenge_count} challenges received</p>
      <Link to={`/listings/${item.listing.id}/challenge`}>Submit a challenge</Link>
    </section>
  );
}
