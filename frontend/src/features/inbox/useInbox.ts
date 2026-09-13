/* Loads the owner-side data for one listing's Offers page, polling so new offers arrive on their own:
   the ranked offers (inbox), the comparison (for the server's monthly baseline row), and the full offer terms.
   Fetch orchestration stays here so row components stay presentation-focused. */
import { ApiQueryState, useApiQuery } from '../../shared/api/useApiQuery';
import type { ComparisonResponse, InboxResponse, OwnerChallengeListResponse } from './types';

// Short enough that switching back to the owner mid-demo shows the new offer almost at once.
const POLL_INTERVAL_MS = 5000;

interface UseInboxResult {
  inbox: ApiQueryState<InboxResponse>;
  comparison: ApiQueryState<ComparisonResponse>;
  ownerOffers: ApiQueryState<OwnerChallengeListResponse>;
  reload: () => void;
}

/** Fetch owner-side inbox, comparison, and offer terms for one listing id. */
export function useInbox(listingId: string): UseInboxResult {
  const inbox = useApiQuery<InboxResponse>(`/api/listings/${listingId}/inbox`, { pollIntervalMs: POLL_INTERVAL_MS });
  const comparison = useApiQuery<ComparisonResponse>(`/api/listings/${listingId}/comparison`, { pollIntervalMs: POLL_INTERVAL_MS });
  const ownerOffers = useApiQuery<OwnerChallengeListResponse>(`/api/listings/${listingId}/challenges`, { pollIntervalMs: POLL_INTERVAL_MS });

  const reload = (): void => {
    inbox.reload();
    comparison.reload();
    ownerOffers.reload();
  };

  return { inbox, comparison, ownerOffers, reload };
}
