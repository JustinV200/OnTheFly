/* Shows public listings whose scope resembles the one being viewed, found by the Mushroom Body FlyHash circuit.
   Every field shown comes from the public listing projection; price is displayed but never used to match.
   The panel carries its fly-brain badge in the header and ends with FlyBrainNote, in every loaded state. */
import { EmptyState } from '../../../shared/components/EmptyState';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { FlyBrainBadge } from '../../../shared/flybrain/FlyBrainBadge';
import { FlyBrainNote } from '../../../shared/flybrain/FlyBrainNote';
import { Callout, Card, Stack } from '../../../shared/ui';
import { SimilarListingCard } from './SimilarListingCard';
import { useSimilarListings } from './useSimilarListings';
import './SimilarListings.css';

interface SimilarListingsProps {
  listingId: string;
}

/** Render similar public listings with scope overlap, or an explicit loading, empty, or error state. */
export function SimilarListings({ listingId }: SimilarListingsProps): JSX.Element {
  const { response, error } = useSimilarListings(listingId);
  const attributions = response?.fly_brain ?? [];

  return (
    <Card
      actions={
        attributions.length > 0
          ? attributions.map((attribution) => <FlyBrainBadge attribution={attribution} key={attribution.component} />)
          : undefined
      }
      title="Similar listings"
    >
      {error ? (
        <Callout role="alert" tone="danger">
          <p>{error}</p>
        </Callout>
      ) : null}
      {!error && !response ? <LoadingSpinner label="Finding similar listings…" /> : null}
      {response ? (
        <Stack gap={4}>
          {response.listings.length === 0 ? (
            <EmptyState title={response.message ?? 'No other public listings with similar scope yet'} />
          ) : (
            <div className="similar-listings__grid">
              {response.listings.map((item) => <SimilarListingCard item={item} key={item.listing.id} />)}
            </div>
          )}
          <FlyBrainNote attributions={response.fly_brain} />
        </Stack>
      ) : null}
    </Card>
  );
}
