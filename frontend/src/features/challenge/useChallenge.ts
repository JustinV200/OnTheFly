/* Submits challenges for the current listing route.
   The hook owns HTTP coordination so the form stays a presentational surface. */
import { post } from '../../shared/api/client';
import type { ChallengePayload, ChallengeResponse } from './types';

/** Submit a challenge payload for one listing id and return the current offer. */
export function useChallenge(): (listingId: string, payload: ChallengePayload) => Promise<ChallengeResponse> {
  return async (listingId: string, payload: ChallengePayload): Promise<ChallengeResponse> => {
    return post<ChallengeResponse>(`/api/listings/${listingId}/challenges`, payload);
  };
}
