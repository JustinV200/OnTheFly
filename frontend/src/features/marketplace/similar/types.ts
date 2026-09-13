/* Declares the similar-listings response from /api/marketplace/:listingId/similar. */
import type { BrainStimulus } from '../../../shared/flybrain/live';
import type { FlyBrainAttribution } from '../../../shared/flybrain/types';
import type { PublicListingProjection } from '../../publish/types';

export interface SimilarListing {
  listing: PublicListingProjection;
  challenge_count: number;
  scope_similarity: number;
  shared_terms: string[];
}

export interface SimilarListingsResponse {
  listings: SimilarListing[];
  message?: string | null;
  fly_brain: FlyBrainAttribution[];
  // What the simulated fly brain view plays alongside these results; null when no circuit ran.
  brain_stimulus: BrainStimulus | null;
}
