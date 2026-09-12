/* Declares inbox and comparison response shapes local to the inbox feature. */
import type { PublicListingProjection } from '../publish/types';

export interface SavingsResponse {
  annual_recurring_savings_minor: number;
  first_year_net_savings_minor: number;
  is_provisional: boolean;
  assumptions: string[];
  label: string;
}

export interface EvidenceRollup {
  label: 'needs review' | 'information missing' | 'checks complete for selected sources';
  sources_checked: string[];
  sources_not_run: string[];
}

export interface EvidenceCheckSummary {
  source: string;
  status: string;
  match_confidence: string | null;
  checked_at: string;
  limitations: string;
}

export interface InboxChallenge {
  challenge_id: string;
  challenger_name: string;
  normalized_price_minor: number;
  price_currency: string;
  scope_completeness: number;
  missing_items: string[];
  added_items: string[];
  unstated_items: string[];
  savings: SavingsResponse;
  evidence_rollup: EvidenceRollup;
  platform_check_status: string;
  identity_check_status: string;
  registry_check_status: string;
  evidence_checks: EvidenceCheckSummary[];
  evidence_last_updated: string;
  provenance: string;
  bidding_mode_at_submission: string;
  submitted_at: string;
  revised_at: string | null;
}

export interface InboxResponse {
  challenges: InboxChallenge[];
  bidding_mode: string;
  // The stored listing record; visibility is "private" once unpublished, while its offers are kept.
  listing: PublicListingProjection;
}

export interface ComparisonRow {
  challenge_id: string | null;
  challenger_name: string;
  is_incumbent: boolean;
  normalized_price_minor: number;
  price_currency: string;
  scope_completeness: number;
  missing_items: string[];
  added_items: string[];
  unstated_items: string[];
  savings: SavingsResponse | null;
  provenance: string;
}

export interface ComparisonResponse {
  rows: ComparisonRow[];
}

// Full owner-visible offer terms from GET /api/listings/{id}/challenges (backend ChallengeResponse).
export interface OwnerChallenge {
  id: string;
  challenger_name: string | null;
  bidding_mode_at_submission: string;
  price_minor: number;
  price_currency: string;
  billing_frequency: string;
  scope_included: string[];
  scope_excluded: string[];
  setup_fee_minor: number;
  minimum_term: string | null;
  other_conditions: string | null;
  message_to_owner: string | null;
  availability: string | null;
  offer_expiry: string | null;
  site_visit_required: boolean;
  provenance: string;
  submitted_at: string;
  revised_at: string | null;
}

export interface OwnerChallengeListResponse {
  challenges: OwnerChallenge[];
  message?: string | null;
}
