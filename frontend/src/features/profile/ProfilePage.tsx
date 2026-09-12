/* Loads and renders a public business profile without acting-account auth.
   It shows only the additive public listing projection returned by the backend. */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { get } from '../../shared/api/client';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { PublicListingCard } from './PublicListingCard';
import type { ProfileResponse } from './types';

/** Render the public profile page for a business handle. */
export function ProfilePage(): JSX.Element {
  const { handle = '' } = useParams();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await get<ProfileResponse>(`/api/profiles/${handle}`);
      setProfile(response);
    })();
  }, [handle]);

  if (!profile) {
    return <LoadingSpinner />;
  }

  return (
    <section>
      <h2>{profile.business_name}</h2>
      <p>{profile.service_area}</p>
      {profile.listings.map((listing) => <PublicListingCard key={listing.id} listing={listing} />)}
    </section>
  );
}
