/* Loads owner-side inbox and comparison data for one listing.
   Fetch orchestration stays here so row components stay presentation-focused. */
import { useEffect, useState } from 'react';

import { get } from '../../shared/api/client';
import type { ComparisonResponse, InboxResponse } from './types';

interface UseInboxResult {
  inbox: InboxResponse | null;
  comparison: ComparisonResponse | null;
}

/** Fetch owner-side inbox and comparison data for one listing id. */
export function useInbox(listingId: string): UseInboxResult {
  const [inbox, setInbox] = useState<InboxResponse | null>(null);
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null);

  useEffect(() => {
    void (async () => {
      setInbox(await get<InboxResponse>(`/api/listings/${listingId}/inbox`));
      setComparison(await get<ComparisonResponse>(`/api/listings/${listingId}/comparison`));
    })();
  }, [listingId]);

  return { inbox, comparison };
}
