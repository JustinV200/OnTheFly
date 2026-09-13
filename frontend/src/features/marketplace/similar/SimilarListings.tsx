/* Shows public listings whose scope resembles the one being viewed, found by the Mushroom Body FlyHash circuit, as
   market cards. Every field shown comes from the public listing projection; price is displayed but never used to match.
   The panel carries its fly-brain badge in the header and ends with FlyBrainNote, in every loaded state. */
import { EmptyState } from '../../../shared/components/EmptyState';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { FlyBrainBadge } from '../../../shared/flybrain/FlyBrainBadge';
import { FlyBrainNote } from '../../../shared/flybrain/FlyBrainNote';
import { MarketCard } from '../../../shared/market';
import { Badge, Callout, Card, Disclosure, Stack } from '../../../shared/ui';
import { MarketGrid } from '../grid/MarketGrid';
import type { SimilarListing } from './types';
import { useSimilarListings } from './useSimilarListings';

interface SimilarListingsProps {
  listingId: string;
}

/** Render similar public listings with their scope match, or an explicit loading, empty, or error state. */
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
            <MarketGrid density="compact">
              {response.listings.map((item) => (
                <MarketCard
                  action={<MatchExplanation item={item} />}
                  extraMeta={<ScopeMatchBadge similarity={item.scope_similarity} />}
                  href={`/listings/${item.listing.id}`}
                  key={item.listing.id}
                  listing={item.listing}
                  offerCount={item.challenge_count}
                />
              ))}
            </MarketGrid>
          )}
          <FlyBrainNote attributions={response.fly_brain} />
        </Stack>
      ) : null}
    </Card>
  );
}

// The percentage is the exact similarity the backend computed; FlyHash only chose which listings to compare.
function ScopeMatchBadge({ similarity }: { similarity: number }): JSX.Element {
  return <Badge tone="flybrain">{Math.round(similarity * 100)}% scope match</Badge>;
}

function MatchExplanation({ item }: { item: SimilarListing }): JSX.Element {
  return (
    <Disclosure summary="How was this matched?">
      <p>
        A {Math.round(item.scope_similarity * 100)}% scope similarity, worked out from the two listings’ public scope fields.
        Price isn’t used to match.
      </p>
      <p>{item.shared_terms.length > 0 ? `Shared: ${item.shared_terms.join(', ')}.` : 'No individual shared terms were reported.'}</p>
    </Disclosure>
  );
}
