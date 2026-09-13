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
  // Scored against the scope version this offer answered, which the next two fields name.
  scope_completeness: number;
  answered_scope_version_number: number;
  is_current_scope_version: boolean;
  // Set when the offer's currency differs from the listing's; such a row is listed apart and never ranked.
  unranked_reason: string | null;
  submitted_at: string;
  provenance: string;
}

export interface LeaderboardResponse {
  bidding_mode: string;
  entries: LeaderboardEntry[];
  // All active offers, including those submitted while sealed, which stay sealed and have no row.
  total_offer_count: number;
  sealed_offer_count: number;
  current_scope_version_number: number;
}
