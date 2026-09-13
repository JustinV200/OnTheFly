/* Loads and renders a public business profile, the page a stranger sees, whoever is acting: the business, then its
   public listings as market cards. It shows only the additive public listing projection; the empty state is the end of
   the privacy proof. */
import { useParams } from 'react-router-dom';

import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { useApiQuery } from '../../shared/api/useApiQuery';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { MarketCard } from '../../shared/market';
import { Badge, ButtonLink, Callout, Cluster, Icon, PageHeader, Stack } from '../../shared/ui';
import type { ProfileResponse } from './types';
import './ProfilePage.css';

/** Render the public profile page for a business handle. */
export function ProfilePage(): JSX.Element {
  const { handle = '' } = useParams();
  const { account } = useActingAccount();
  const profile = useApiQuery<ProfileResponse>(`/api/profiles/${handle}`);

  if (profile.error?.status === 404) {
    // A page of its own, with an h1, so a mistyped handle reads as a defined outcome rather than a broken profile.
    return (
      <Stack gap={5}>
        <PageHeader eyebrow="Public profile" subtitle="Check the link for typos." title="No business has this profile address" />
        <Cluster>
          <ButtonLink to="/marketplace" variant="primary">Browse the markets</ButtonLink>
        </Cluster>
      </Stack>
    );
  }
  if (!profile.data) {
    return profile.error
      ? <ErrorState error={profile.error} onRetry={profile.reload} title="Couldn’t load this profile" />
      : <LoadingSpinner label="Loading public profile…" />;
  }

  const { business_name: businessName, listings } = profile.data;
  const isOwnProfile = account?.handle === profile.data.handle;
  const count = listings.length;

  return (
    <Stack gap={6}>
      <PageHeader
        eyebrow="Public profile"
        // With no listings the empty state below says so; a "0 public listings" badge beside it would just repeat it.
        meta={count > 0 ? <Badge icon={<Icon name="globe" />} tone="neutral">{count === 1 ? '1 public listing' : `${count} public listings`}</Badge> : undefined}
        subtitle={profile.data.service_area}
        title={
          <span className="profile-page__identity">
            {/* Decorative initials; the heading's accessible name stays the business name alone. */}
            <span aria-hidden="true" className="profile-page__monogram">{initials(businessName)}</span>
            <span>{businessName}</span>
          </span>
        }
      />

      <Callout icon="eye" role="note" title="Public view" tone="neutral">
        <p>
          This page is identical for everyone, signed in or not. Only expenses {businessName} chose to publish appear here.
          {isOwnProfile ? ' Your private expenses are on your dashboard, not here.' : ''}
        </p>
      </Callout>

      <Stack as="section" gap={3}>
        <h2 className="profile-page__section-title">Public listings</h2>
        {count === 0 ? (
          <EmptyState title="No public listings right now">
            {businessName} hasn’t published any expenses. Everything it pays for is private until it chooses to publish one.
          </EmptyState>
        ) : (
          <>
            <p className="ui-text-muted ui-text-sm">Prices are published by {businessName}.</p>
            <div className="profile-page__listings">
              {listings.map((listing) => (
                // No offer count: the profile response doesn't carry one, and a guessed zero would misstate a live market.
                <MarketCard href={`/listings/${listing.id}`} key={listing.id} listing={listing} offerCount={null} />
              ))}
            </div>
          </>
        )}
      </Stack>
    </Stack>
  );
}

function initials(businessName: string): string {
  // First letters of the first two words ("Apex Facilities Group" → "AF"); a one-word name gives one letter.
  return businessName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}
