/* Shows public listings whose scope resembles the one being viewed, found by the Mushroom Body FlyHash circuit.
   Every field shown comes from the public listing projection; price is displayed but never used to match. */
import { Link } from 'react-router-dom';

import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { FlyBrainBadge } from '../../../shared/flybrain/FlyBrainBadge';
import { FlyBrainNote } from '../../../shared/flybrain/FlyBrainNote';
import { useSimilarListings } from './useSimilarListings';

interface SimilarListingsProps {
  listingId: string;
}

/** Render similar public listings with scope overlap, or an explicit empty or error state. */
export function SimilarListings({ listingId }: SimilarListingsProps): JSX.Element {
  const { response, error } = useSimilarListings(listingId);

  if (error) {
    return <p role="alert">{error}</p>;
  }
  if (!response) {
    return <LoadingSpinner />;
  }

  const attribution = response.fly_brain[0];

  return (
    <section aria-label="Similar listings" style={{ marginTop: '1.5rem' }}>
      <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ margin: 0 }}>Similar listings</h3>
        {attribution ? <FlyBrainBadge attribution={attribution} /> : null}
      </div>
      {response.listings.length === 0 ? <p>{response.message ?? 'No other public listings with similar scope yet.'}</p> : null}
      {response.listings.map((item) => (
        <article
          key={item.listing.id}
          style={{ border: '1px solid #e2e8f0', borderRadius: '12px', margin: '0.75rem 0', padding: '0.75rem 1rem' }}
        >
          <p style={{ margin: '0 0 0.25rem' }}>{item.listing.scope_summary}</p>
          <p style={{ margin: '0 0 0.25rem' }}>
            <MoneyDisplay amountMinor={item.listing.price_minor} currency={item.listing.price_currency} /> /{' '}
            {item.listing.billing_cadence} · {item.challenge_count} challenges
          </p>
          <p style={{ color: '#475569', fontSize: '0.85rem', margin: '0 0 0.25rem' }}>
            Scope match {Math.round(item.scope_similarity * 100)}%
            {item.shared_terms.length > 0 ? ` · shared: ${item.shared_terms.join(', ')}` : ''}
          </p>
          <Link to={`/listings/${item.listing.id}`}>View listing</Link>
        </article>
      ))}
      <FlyBrainNote attributions={response.fly_brain} />
    </section>
  );
}
