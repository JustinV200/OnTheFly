/* Shows one public listing, its bidding terms, and its offers, as any visitor sees it.
   An unpublished listing gets a defined "no longer public" state, not a spinner. */
import { Link, useParams } from 'react-router-dom';

import { useApiQuery } from '../../shared/api/useApiQuery';
import { BiddingModePill } from '../../shared/components/BiddingModePill';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { categoryLabel } from '../../shared/format/categoryLabel';
import { describeDeadline } from '../../shared/format/describeDeadline';
import { formatTimestamp } from '../../shared/format/formatTimestamp';
import { Leaderboard } from './leaderboard/Leaderboard';
import { SimilarListings } from './similar/SimilarListings';
import type { MarketplaceListing } from './types';

const POLL_INTERVAL_MS = 10000;

/** Render one public listing detail page fetched by listing ID. */
export function ListingDetailPage(): JSX.Element {
  const { id = '' } = useParams();
  const query = useApiQuery<MarketplaceListing>(`/api/marketplace/${id}`, { pollIntervalMs: POLL_INTERVAL_MS });

  if (query.error?.status === 404) {
    return (
      <EmptyState action={<Link to="/marketplace">Browse listings that are public</Link>} title="This listing isn’t public">
        Its owner may have unpublished it, or the link is wrong. Offers already made on it stay private with the owner.
      </EmptyState>
    );
  }
  if (!query.data) {
    return query.error
      ? <ErrorState error={query.error} onRetry={query.reload} title="Couldn’t load this listing" />
      : <LoadingSpinner label="Loading listing…" />;
  }

  const { listing, challenge_count: offerCount } = query.data;
  const deadline = describeDeadline(listing.challenge_deadline);

  return (
    <section>
      <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ margin: 0 }}>{categoryLabel(listing.category)}</h2>
        <BiddingModePill mode={listing.bidding_mode} />
      </div>
      <p style={{ fontSize: '1.5rem', margin: '0.5rem 0' }}>
        Currently pays <MoneyDisplay amountMinor={listing.price_minor} currency={listing.price_currency} /> / {listing.billing_cadence}
      </p>
      <p style={{ margin: '0 0 0.25rem' }}>{listing.scope_summary}</p>
      <p style={{ margin: '0 0 0.25rem' }}>Area: {listing.service_area_approximate || 'not specified'}</p>
      {listing.incumbent_vendor_name ? <p style={{ margin: '0 0 0.25rem' }}>Current vendor: {listing.incumbent_vendor_name}</p> : null}
      <p style={{ color: '#475569', margin: '0 0 0.75rem' }}>
        Price and scope as published by the business{listing.published_at ? ` on ${formatTimestamp(listing.published_at)}` : ''}.
      </p>

      <p style={{ backgroundColor: '#f8fafc', borderRadius: '8px', margin: 0, padding: '0.6rem 0.8rem' }}>
        <strong>Bidding terms: </strong>
        {listing.bidding_mode === 'open'
          ? 'open. Your price and scope will be visible to other challengers. Your identity will not.'
          : 'sealed. Only the offer count is public. Your price stays with the owner, and your identity is never shown to other challengers.'}
      </p>

      {deadline.isClosed ? (
        <EmptyState title="Closed to new offers">{deadline.text}. Offers already made still count.</EmptyState>
      ) : (
        <p style={{ margin: '0.75rem 0' }}>
          {deadline.text}.{' '}
          <Link style={{ fontWeight: 700 }} to={`/listings/${listing.id}/challenge`}>Challenge this price →</Link>
        </p>
      )}

      {offerCount === 0 ? (
        <EmptyState title="No offers yet">
          This listing is live and waiting for its first challenger. Most listings in a young marketplace start here.
        </EmptyState>
      ) : (
        <Leaderboard listingId={listing.id} />
      )}

      <SimilarListings listingId={listing.id} />
    </section>
  );
}
