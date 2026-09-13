/* The market page's Leaderboard tab: the priced, anonymized offers of an open-bidding listing, ranked by the server.
   The ranking rule sits above the table (one line, details on demand) so nobody reads the order as "cheapest first".
   Offers made while sealed are counted but never priced here, even after the owner opens bidding. */
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
}

/** Render the leaderboard tab for the page's shared leaderboard query, with every non-happy state spelled out. */
export function LeaderboardTab({ board }: LeaderboardTabProps): JSX.Element {
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
            <p className="ui-text-sm">Ranked by scope covered, then monthly price. Bidders are anonymous to each other.</p>
            <Disclosure summary="How ranking works">
              <p>
                Offers that cover more of the requested scope rank above cheaper offers that cover less, so quietly doing less
                never wins. Prices are converted to a monthly figure by the server before ranking, whatever period each
                offer is billed on. Offers that answered an earlier scope version, or that are priced in another currency,
                are listed in their own groups and aren’t ranked against the rest.
              </p>
            </Disclosure>
          </div>
          {entries.length === 0 ? (
            <EmptyState title="No published prices yet">The first open offer sets the price to beat.</EmptyState>
          ) : (
            <LeaderboardTable currentScopeVersion={currentVersion} entries={entries} />
          )}
          {entries.length === 1 ? <p className="ui-text-muted ui-text-sm">One published offer so far: nothing to rank it against yet.</p> : null}
        </>
      ) : (
        <Callout role="note" title="Bidding is sealed now" tone="private">
          <p>Offer prices are no longer public on this listing. Only the business sees them.</p>
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
