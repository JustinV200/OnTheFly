/* Polls a public listing's anonymized leaderboard. One subscription per page, so every view of the offers on it (the
   offer chart, the leaderboard table, the sealed count) reads the same response and can't disagree. */
import { ApiQueryState, useApiQuery } from '../../../shared/api/useApiQuery';
import type { LeaderboardResponse } from '../types';

// Fast enough that an underbid shows up while the audience is still watching.
const POLL_INTERVAL_MS = 4000;

/** Load and poll the leaderboard for a listing id; pass null to stop (e.g. once the listing is known to be private). */
export function useLeaderboard(listingId: string | null): ApiQueryState<LeaderboardResponse> {
  return useApiQuery<LeaderboardResponse>(listingId ? `/api/listings/${listingId}/leaderboard` : null, { pollIntervalMs: POLL_INTERVAL_MS });
}
