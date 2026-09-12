/* Loads and renders the public marketplace feed with a category filter.
   The page remains read-only and never reaches into private expense data. */
import { useState } from 'react';

import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { ApiQueryState, useApiQuery } from '../../shared/api/useApiQuery';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { categoryLabel } from '../../shared/format/categoryLabel';
import { ListingCard } from './ListingCard';
import type { MarketplaceFeedResponse } from './types';

// One category in scope for the MVP (CLAUDE.md, "Scope discipline"); the filter still shows its empty state.
const CATEGORY_OPTIONS = ['cleaning'];
const POLL_INTERVAL_MS = 10000;

/** Render the public marketplace feed for published listings. */
export function MarketplacePage(): JSX.Element {
  const { account } = useActingAccount();
  const [category, setCategory] = useState('');
  const feed = useApiQuery<MarketplaceFeedResponse>(
    `/api/marketplace${category ? `?category=${encodeURIComponent(category)}` : ''}`,
    { pollIntervalMs: POLL_INTERVAL_MS },
  );

  return (
    <section>
      <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0 }}>Marketplace</h2>
          <p style={{ color: '#475569', margin: '0.25rem 0 0' }}>
            Prices businesses chose to publish. {account ? 'Your own listings are not shown here.' : 'Pick a business above to challenge one.'}
          </p>
        </div>
        <label>
          Category{' '}
          <select onChange={(event) => setCategory(event.target.value)} value={category}>
            <option value="">All categories</option>
            {CATEGORY_OPTIONS.map((option) => <option key={option} value={option}>{categoryLabel(option)}</option>)}
          </select>
        </label>
      </div>

      <FeedBody category={category} feed={feed} />
    </section>
  );
}

function FeedBody({ category, feed }: { category: string; feed: ApiQueryState<MarketplaceFeedResponse> }): JSX.Element {
  if (!feed.data) {
    return feed.error
      ? <ErrorState error={feed.error} onRetry={feed.reload} title="Couldn’t load the marketplace" />
      : <LoadingSpinner label="Loading public listings…" />;
  }
  if (feed.data.listings.length === 0) {
    return (
      <EmptyState title={category ? `No public listings in ${categoryLabel(category)} yet` : 'No public listings yet'}>
        A listing appears here the moment a business publishes one of its expenses. Everything else a business pays for stays
        private, so a quiet feed is what a young marketplace looks like, not an error.
      </EmptyState>
    );
  }
  return (
    <div style={{ marginTop: '1rem' }}>
      {feed.data.listings.map((item) => <ListingCard item={item} key={item.listing.id} />)}
    </div>
  );
}
