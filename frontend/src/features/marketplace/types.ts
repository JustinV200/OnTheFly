/* Declares marketplace feed, listing-detail, and leaderboard shapes for browsing pages. */
import type { PublicListingProjection } from '../publish/types';

export interface MarketplaceListing {
  listing: PublicListingProjection;
  challenge_count: number;
}

export interface MarketplaceFeedResponse {
  listings: MarketplaceListing[];
  message?: string | null;
}

export interface LeaderboardEntry {
  challenge_id: string;
  normalized_price_minor: number;
  price_currency: string;
  scope_completeness: number;
  submitted_at: string;
  provenance: string;
}

export interface LeaderboardResponse {
  bidding_mode: string;
  entries: LeaderboardEntry[];
  // All active offers, including those submitted while sealed, which stay sealed and have no row.
  total_offer_count: number;
  sealed_offer_count: number;
}
