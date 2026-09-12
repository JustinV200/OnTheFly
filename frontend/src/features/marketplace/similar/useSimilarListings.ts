/* Fetches public listings with scope similar to one public listing.
   Failures surface as a message so an outage never reads as "no similar listings". */
import { useEffect, useState } from 'react';

import { ApiError, get } from '../../../shared/api/client';
import type { SimilarListingsResponse } from './types';

interface UseSimilarListingsResult {
  response: SimilarListingsResponse | null;
  error: string | null;
}

/** Load similar listings for a listing ID, ignoring responses for a listing no longer shown. */
export function useSimilarListings(listingId: string): UseSimilarListingsResult {
  const [response, setResponse] = useState<SimilarListingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    setResponse(null);
    setError(null);

    void (async () => {
      try {
        const payload = await get<SimilarListingsResponse>(`/api/marketplace/${listingId}/similar`);
        if (isCurrent) {
          setResponse(payload);
        }
      } catch (caught) {
        if (isCurrent) {
          setError(
            caught instanceof ApiError
              ? `Similar listings are unavailable: ${caught.message}`
              : 'Similar listings are unavailable: the backend could not be reached.',
          );
        }
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [listingId]);

  return { response, error };
}
