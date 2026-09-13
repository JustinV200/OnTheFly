/* The public offers view for a sealed listing: how many offers exist, and nothing about their prices or authors. */
import type { ReactNode } from 'react';

import { Callout, Card, Stack, Stat } from '../../../shared/ui';

interface SealedOfferCountProps {
  totalCount: number;
  // A stale-data notice to show above the count, or null when the last refresh succeeded.
  staleNotice: ReactNode;
}

/** Render the sealed-bidding offer count and what sealed means for those prices. */
export function SealedOfferCount({ totalCount, staleNotice }: SealedOfferCountProps): JSX.Element {
  return (
    <Card title="Offers">
      <Stack gap={4}>
        {staleNotice}
        <Stat label="Offers received" size="lg" value={totalCount} />
        <Callout role="note" tone="private">
          <p>Sealed bidding: only the count is public. Every price stays with the listing owner.</p>
        </Callout>
      </Stack>
    </Card>
  );
}
