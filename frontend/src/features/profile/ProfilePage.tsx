/* Loads and renders a public business profile, the page a stranger sees, whoever is acting.
   It shows only the additive public listing projection; the empty state is the end of the privacy proof. */
import { Link, useParams } from 'react-router-dom';

import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { useApiQuery } from '../../shared/api/useApiQuery';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { PublicListingCard } from './PublicListingCard';
import type { ProfileResponse } from './types';

/** Render the public profile page for a business handle. */
export function ProfilePage(): JSX.Element {
  const { handle = '' } = useParams();
  const { account } = useActingAccount();
  const profile = useApiQuery<ProfileResponse>(`/api/profiles/${handle}`);

  if (profile.error?.status === 404) {
    return (
      <EmptyState action={<Link to="/marketplace">Browse the marketplace</Link>} title="No business has this profile address">
        Check the link for typos.
      </EmptyState>
    );
  }
  if (!profile.data) {
    return profile.error
      ? <ErrorState error={profile.error} onRetry={profile.reload} title="Couldn’t load this profile" />
      : <LoadingSpinner label="Loading public profile…" />;
  }

  const isOwnProfile = account?.handle === profile.data.handle;
  return (
    <section>
      <p style={{ backgroundColor: '#f1f5f9', borderRadius: '8px', margin: '0 0 1rem', padding: '0.5rem 0.8rem' }}>
        👁 Public view: this page is identical for everyone, signed in or not.
        {isOwnProfile ? ' Your private expenses are on your dashboard, not here.' : ''}
      </p>
      <h2 style={{ margin: 0 }}>{profile.data.business_name}</h2>
      <p style={{ color: '#475569', marginTop: '0.25rem' }}>{profile.data.service_area}</p>

      {profile.data.listings.length === 0 ? (
        <EmptyState title="No public listings right now">
          {profile.data.business_name} hasn’t published any expenses. Everything it pays for is private until it chooses to publish
          one.
        </EmptyState>
      ) : (
        <>
          <h3>
            {profile.data.listings.length} public {profile.data.listings.length === 1 ? 'listing' : 'listings'}
          </h3>
          {profile.data.listings.map((listing) => <PublicListingCard key={listing.id} listing={listing} />)}
        </>
      )}
    </section>
  );
}
