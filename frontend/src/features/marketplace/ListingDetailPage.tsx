/* Shows one public listing, its bidding terms, and its offers, as any visitor sees it.
   An unpublished listing gets a defined "no longer public" state, not a spinner. */
import { useParams } from 'react-router-dom';

import { useApiQuery } from '../../shared/api/useApiQuery';
import { BiddingModePill } from '../../shared/components/BiddingModePill';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { categoryLabel } from '../../shared/format/categoryLabel';
import { describeDeadline } from '../../shared/format/describeDeadline';
import { Badge, Card, Icon, PageHeader, Stack } from '../../shared/ui';
import { ChallengePanel } from './detail/ChallengePanel';
import { ListingNotPublic } from './detail/ListingNotPublic';
import { ListingOverviewCard } from './detail/ListingOverviewCard';
import { Leaderboard } from './leaderboard/Leaderboard';
import { offerCountText } from './offerCountText';
import { SimilarListings } from './similar/SimilarListings';
import type { MarketplaceListing } from './types';
import './ListingDetailPage.css';

const POLL_INTERVAL_MS = 10000;

/** Render one public listing detail page fetched by listing ID. */
export function ListingDetailPage(): JSX.Element {
  const { id = '' } = useParams();
  const query = useApiQuery<MarketplaceListing>(`/api/marketplace/${id}`, { pollIntervalMs: POLL_INTERVAL_MS });

  if (query.error?.status === 404) {
    return <ListingNotPublic />;
  }
  if (!query.data) {
    return query.error
      ? <ErrorState error={query.error} onRetry={query.reload} title="Couldn’t load this listing" />
      : <LoadingSpinner label="Loading listing…" />;
  }

  const { listing, challenge_count: offerCount } = query.data;
  const deadline = describeDeadline(listing.challenge_deadline);

  return (
    <Stack gap={6}>
      <PageHeader
        eyebrow="Public listing"
        meta={
          <>
            <BiddingModePill mode={listing.bidding_mode} />
            {deadline.isClosed
              ? <Badge icon={<Icon name="lock" />} tone="neutral">Closed to new offers</Badge>
              : <Badge tone="neutral">Open for offers</Badge>}
            <Badge tone="neutral">{offerCountText(offerCount)}</Badge>
          </>
        }
        subtitle={listing.service_area_approximate || 'Area not specified'}
        title={categoryLabel(listing.category)}
      />

      {/* A failed poll keeps the last listing visible, but never silently: its price or terms may have changed. */}
      {query.error ? (
        <ErrorState error={query.error} onRetry={query.reload} title="Showing the last loaded listing; a refresh failed" />
      ) : null}

      <div className="listing-detail__layout">
        <ListingOverviewCard listing={listing} />
        <ChallengePanel deadline={deadline} listing={listing} />
      </div>

      {offerCount === 0 ? (
        <Card title="Offers">
          <Stack>
            <EmptyState title="No offers yet">
              This listing is live and waiting for its first challenger. Most listings in a young marketplace start here.
            </EmptyState>
          </Stack>
        </Card>
      ) : (
        <Leaderboard listingId={listing.id} />
      )}

      <SimilarListings listingId={listing.id} />
    </Stack>
  );
}
