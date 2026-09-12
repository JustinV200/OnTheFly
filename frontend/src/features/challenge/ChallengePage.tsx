/* Hosts the challenge form for a selected public listing.
   Fetches the listing first so the real bidding mode is shown before submission. */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { get } from '../../shared/api/client';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import type { MarketplaceListing } from '../marketplace/types';
import { ChallengeForm } from './ChallengeForm';
import type { ChallengeResponse } from './types';
import { useChallenge } from './useChallenge';

/** Render the challenge page and show the latest submission result. */
export function ChallengePage(): JSX.Element {
  const { id = '' } = useParams();
  const submitChallenge = useChallenge();
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [submitted, setSubmitted] = useState<ChallengeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await get<MarketplaceListing>(`/api/marketplace/${id}`);
        setListing(data);
      } catch {
        setError('Listing not found or is no longer public.');
      }
    })();
  }, [id]);

  if (error) {
    return <p>{error}</p>;
  }

  if (!listing) {
    return <LoadingSpinner />;
  }

  return (
    <section>
      <h2>Submit challenge</h2>
      {/* Bidding mode is stated before the form so the challenger is never surprised. */}
      <ChallengeForm
        biddingMode={listing.listing.bidding_mode}
        onSubmit={async (payload) => setSubmitted(await submitChallenge(id, payload))}
      />
      {submitted
        ? <p>Challenge submitted (mode: {submitted.bidding_mode_at_submission}, price: {submitted.price_minor} minor units).</p>
        : null}
    </section>
  );
}
