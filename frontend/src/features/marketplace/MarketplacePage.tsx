/* Loads and renders the public marketplace feed with basic filters.
   The page remains read-only and never reaches into private expense data. */
import { useEffect, useState } from 'react';

import { get } from '../../shared/api/client';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ListingCard } from './ListingCard';
import type { MarketplaceFeedResponse } from './types';

/** Render the public marketplace feed for published listings. */
export function MarketplacePage(): JSX.Element {
  const [feed, setFeed] = useState<MarketplaceFeedResponse | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await get<MarketplaceFeedResponse>('/api/marketplace');
      setFeed(response);
    })();
  }, []);

  if (!feed) {
    return <LoadingSpinner />;
  }

  return (
    <section>
      <h2>Marketplace</h2>
      {feed.message ? <p>{feed.message}</p> : null}
      {feed.listings.map((item) => <ListingCard key={item.listing.id} item={item} />)}
    </section>
  );
}
