/* Loads and renders the public marketplace feed with a category filter.
   The page remains read-only and never reaches into private expense data. */
import { useState } from 'react';

import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { useApiQuery } from '../../shared/api/useApiQuery';
import { categoryLabel } from '../../shared/format/categoryLabel';
import { Field, PageHeader, Select, Stack } from '../../shared/ui';
import { FeedBody } from './feed/FeedBody';
import type { MarketplaceFeedResponse } from './types';
import './MarketplacePage.css';

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
    <Stack gap={6}>
      <PageHeader
        actions={
          <Field className="marketplace-page__filter" label="Category">
            <Select onChange={(event) => setCategory(event.target.value)} value={category}>
              <option value="">All categories</option>
              {CATEGORY_OPTIONS.map((option) => <option key={option} value={option}>{categoryLabel(option)}</option>)}
            </Select>
          </Field>
        }
        subtitle={`Prices businesses chose to publish. ${account ? 'Your own listings are not shown here.' : 'Pick a business above to challenge one.'}`}
        title="Marketplace"
      />

      <section aria-labelledby="marketplace-listings-heading">
        {/* The count line under it is visible; this heading keeps the outline h1 → h2 → card h3 for screen readers. */}
        <h2 className="ui-visually-hidden" id="marketplace-listings-heading">Public listings</h2>
        <FeedBody category={category} feed={feed} />
      </section>
    </Stack>
  );
}
