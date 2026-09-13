/* The market page's Leaderboard tab: the priced, anonymized offers of an open-bidding listing, ranked by the server.
   The ranking rule sits above the table under "How ranking works", stated once, so nobody reads the order as
   "cheapest first". Offers made while sealed are counted but never priced here, even after the owner opens bidding. */
import type { ApiQueryState } from '../../../shared/api/useApiQuery';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { Callout, Disclosure, Stack } from '../../../shared/ui';
import type { LeaderboardResponse } from '../types';
import { LeaderboardTable } from './LeaderboardTable';
import { sealedOfferNote } from './sealedOfferNote';

interface LeaderboardTabProps {
  board: ApiQueryState<LeaderboardResponse>;
  // Past the deadline no new offer can arrive, so the empty state mustn't invite one.
  isClosed: boolean;
}

/** Render the leaderboard tab for the page's shared leaderboard query, with every non-happy state spelled out. */
export function LeaderboardTab({ board, isClosed }: LeaderboardTabProps): JSX.Element {
  if (!board.data) {
    return board.error
      ? <ErrorState error={board.error} onRetry={board.reload} title="Leaderboard unavailable" />
      : <LoadingSpinner label="Loading offers…" />;
  }

  const { entries, sealed_offer_count: sealedCount, current_scope_version_number: currentVersion } = board.data;
  // The listing and the leaderboard poll separately; if the owner sealed bidding in between, trust the leaderboard.
  const isOpen = board.data.bidding_mode === 'open';

  return (
    <Stack gap={4}>
      {/* A failed poll leaves the last prices on screen; say so, since an underbid may have landed since. */}
      {board.error ? <ErrorState error={board.error} onRetry={board.reload} title="Showing the last loaded offers; a refresh failed" /> : null}

      {isOpen ? (
        <>
          <div>
            <p className="ui-text-sm">Bidders are anonymous to each other.</p>
            {/* The per-month wording mirrors the backend's ranking (services/comparison/normalize.py), whatever the listing's period. */}
            <Disclosure summary="How ranking works">
              <p>
                Ranked by scope covered first, then by price compared per month. A cheaper offer that covers less scope never
                ranks above one that covers more.
              </p>
            </Disclosure>
          </div>
          {entries.length === 0 ? (
            <EmptyState title="No published prices yet">
              {isClosed ? 'This task closed before any open offer was priced.' : 'The first open offer sets the price to beat.'}
            </EmptyState>
          ) : (
            <LeaderboardTable currentScopeVersion={currentVersion} entries={entries} />
          )}
          {entries.length === 1 ? <p className="ui-text-muted ui-text-sm">One published offer so far: nothing to rank it against yet.</p> : null}
        </>
      ) : (
        <Callout role="note" title="Bidding is sealed now" tone="private">
          <p>Offer prices are no longer public on this market. Only the business sees them.</p>
        </Callout>
      )}

      {isOpen && sealedCount > 0 ? (
        <Callout role="note" tone="private">
          <p>{sealedOfferNote(sealedCount)}</p>
        </Callout>
      ) : null}
    </Stack>
  );
}
