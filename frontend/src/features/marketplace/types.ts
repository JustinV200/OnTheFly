/* Declares marketplace feed and listing-detail shapes for browsing pages. */
import type { PublicListingProjection } from '../publish/types';

export interface MarketplaceListing {
  listing: PublicListingProjection;
  challenge_count: number;
}

export interface MarketplaceFeedResponse {
  listings: MarketplaceListing[];
  message?: string | null;
}
