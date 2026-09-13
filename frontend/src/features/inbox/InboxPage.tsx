/* The owner's offers inbox for one listing: status and controls, any genuine offer first, every offer, then the comparison.
   It polls, so an offer made by another business shows up after switching back without a refresh. */
import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';

import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { useApiQuery } from '../../shared/api/useApiQuery';
import { BiddingModePill } from '../../shared/components/BiddingModePill';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { categoryLabel } from '../../shared/format/categoryLabel';
import { ButtonLink, Callout, Grid, PageHeader, Stack } from '../../shared/ui';
import { ComparisonView } from './comparison/ComparisonView';
import { ListingControls } from './controls/ListingControls';
import { ListingVisibilityBadge } from './controls/ListingVisibilityBadge';
import { CurrentPriceCard } from './CurrentPriceCard';
import { GenuineOfferCallout } from './offers/GenuineOfferCallout';
import { OffersTable } from './offers/OffersTable';
import type { OwnerChallengeListResponse } from './types';
import { useInbox } from './useInbox';
import './InboxPage.css';

/** Render the owner inbox page for one listing. */
export function InboxPage(): JSX.Element {
  const { id = '' } = useParams();
  const { account } = useActingAccount();
  const { inbox, comparison, reload } = useInbox(id);
  const ownerOffers = useApiQuery<OwnerChallengeListResponse>(`/api/listings/${id}/challenges`, { pollIntervalMs: 5000 });

  if (inbox.error?.status === 404 || inbox.error?.status === 401) {
    // Same message whether the listing is missing or belongs to someone else, so ids can't be probed.
    return (
      <InboxPageFrame>
        <EmptyState action={<ButtonLink to="/marketplace">Back to the marketplace</ButtonLink>} title="Only this listing’s owner can see its offers">
          {account ? `You're acting as ${account.businessName}, which doesn't own this listing.` : 'Pick the owning business in the bar above.'}{' '}
          Other challengers never see who made an offer.
        </EmptyState>
      </InboxPageFrame>
    );
  }
  if (!inbox.data) {
    return (
      <InboxPageFrame>
        {inbox.error
          ? <ErrorState error={inbox.error} onRetry={reload} title="Couldn’t load offers" />
          : <LoadingSpinner label="Loading offers…" />}
      </InboxPageFrame>
    );
  }

  const { listing, challenges, current_scope_version_number: currentScopeVersionNumber } = inbox.data;
  return (
    <Stack gap={6}>
      <PageHeader
        meta={(
          <>
            <ListingVisibilityBadge visibility={listing.visibility} />
            <BiddingModePill mode={listing.bidding_mode} />
          </>
        )}
        subtitle={listing.scope_summary}
        title={`Offers on your ${categoryLabel(listing.category).toLowerCase()} listing`}
      />
      {listing.visibility !== 'public' ? (
        <Callout role="status" title="This listing is private now" tone="private">
          <p>Nobody else can see it. The offers below arrived while it was public and are kept for you.</p>
        </Callout>
      ) : null}
      {inbox.error ? <ErrorState error={inbox.error} onRetry={reload} title="Showing the last loaded offers; a refresh failed" /> : null}

      <Grid className="inbox-page__overview" minItemWidth="20rem">
        <CurrentPriceCard listing={listing} offerCount={challenges.length} />
        <ListingControls listing={listing} onChanged={reload} />
      </Grid>
      <GenuineOfferCallout offers={ownerOffers} />

      {challenges.length === 0 ? (
        <EmptyState action={<ButtonLink to={`/listings/${listing.id}`}>See the listing as challengers do</ButtonLink>} title="No offers yet">
          {listing.visibility === 'public'
            ? 'Your listing is live, and the public sees "no offers yet". New offers appear here automatically. Most listings start this way.'
            : 'No offers arrived while this listing was public.'}
        </EmptyState>
      ) : (
        <OffersTable challenges={challenges} currentScopeVersionNumber={currentScopeVersionNumber} />
      )}

      {challenges.length > 0 && comparison.data ? (
        <ComparisonView currentScopeVersionNumber={comparison.data.current_scope_version_number} rows={comparison.data.rows} />
      ) : null}
      {challenges.length > 0 && !comparison.data && comparison.error ? (
        <ErrorState error={comparison.error} onRetry={reload} title="Couldn’t load the comparison" />
      ) : null}
      {challenges.length > 0 && !comparison.data && !comparison.error ? <LoadingSpinner label="Loading the comparison…" /> : null}
    </Stack>
  );
}

// Gives the states shown before the inbox loads the page's h1, so no message sits under a missing heading.
function InboxPageFrame({ children }: { children: ReactNode }): JSX.Element {
  return (
    <Stack gap={6}>
      <PageHeader title="Offers on your listing" />
      {children}
    </Stack>
  );
}
