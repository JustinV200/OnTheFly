/* The open-bidding leaderboard section: how ranking works, the priced offers, and how many stayed sealed.
   The ranking explanation sits above the table so nobody reads the order as "cheapest first". */
import type { ReactNode } from 'react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { Callout, Card, Stack } from '../../../shared/ui';
import type { LeaderboardResponse } from '../types';
import { LeaderboardTable } from './LeaderboardTable';

interface OpenLeaderboardProps {
  board: LeaderboardResponse;
  // A stale-data notice to show above the table, or null when the last refresh succeeded.
  staleNotice: ReactNode;
}

/** Render the ranked, anonymized offers for an open-bidding listing with its empty and single-offer notes. */
export function OpenLeaderboard({ board, staleNotice }: OpenLeaderboardProps): JSX.Element {
  const { entries, sealed_offer_count: sealedCount, current_scope_version_number: currentVersion } = board;

  return (
    <Card
      description={
        <p>
          Ranked by how much of the requested scope an offer covers, then by monthly price, so a cheaper offer that quietly
          does less doesn’t rank first. Bidders are anonymous to each other.
        </p>
      }
      title="Open bidding leaderboard"
    >
      <Stack gap={4}>
        {staleNotice}
        {entries.length === 0 ? (
          <EmptyState title="No published prices yet">The first open offer sets the price to beat.</EmptyState>
        ) : null}
        {entries.length === 1 ? <p className="ui-text-muted">One published offer so far: nothing to rank it against yet.</p> : null}
        {entries.length > 0 ? <LeaderboardTable currentScopeVersion={currentVersion} entries={entries} /> : null}
        {sealedCount > 0 ? (
          <Callout role="note" tone="private">
            <p>{sealedOfferNote(sealedCount)}</p>
          </Callout>
        ) : null}
      </Stack>
    </Card>
  );
}

function sealedOfferNote(sealedCount: number): string {
  const isOne = sealedCount === 1;
  return `${sealedCount} ${isOne ? 'offer was' : 'offers were'} made while bidding was sealed and ${isOne ? 'stays' : 'stay'} sealed: counted, never priced here.`;
}
