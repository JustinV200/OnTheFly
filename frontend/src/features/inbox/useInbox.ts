/* Loads owner-side inbox and comparison data for one listing, polling so new offers arrive on their own.
   Fetch orchestration stays here so row components stay presentation-focused. */
import { ApiQueryState, useApiQuery } from '../../shared/api/useApiQuery';
import type { ComparisonResponse, InboxResponse } from './types';

// Short enough that switching back to the owner mid-demo shows the new offer almost at once.
const POLL_INTERVAL_MS = 5000;

interface UseInboxResult {
  inbox: ApiQueryState<InboxResponse>;
  comparison: ApiQueryState<ComparisonResponse>;
  reload: () => void;
}

/** Fetch owner-side inbox and comparison data for one listing id. */
export function useInbox(listingId: string): UseInboxResult {
  const inbox = useApiQuery<InboxResponse>(`/api/listings/${listingId}/inbox`, { pollIntervalMs: POLL_INTERVAL_MS });
  const comparison = useApiQuery<ComparisonResponse>(`/api/listings/${listingId}/comparison`, { pollIntervalMs: POLL_INTERVAL_MS });

  const reload = (): void => {
    inbox.reload();
    comparison.reload();
  };

  return { inbox, comparison, reload };
}
