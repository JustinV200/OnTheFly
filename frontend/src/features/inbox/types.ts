/* Declares inbox and comparison response shapes local to the inbox feature. */
import type { BrainStimulus } from '../../shared/flybrain/live';
import type { RequirementAnswerItem } from '../../shared/offers/RequirementAnswerList';
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
  // Scope figures and savings are measured against the version this offer answered, not the newest one.
  answered_scope_version_number: number;
  is_current_scope_version: boolean;
  // The monthly price this offer's savings use: the one confirmed on its answered scope version. Null for a new task
  // with no budget, where there is nothing to compare against.
  baseline_monthly_minor: number | null;
  baseline_currency: string;
  // Null only for an unranked offer; unranked_reason then says why there is no figure.
  savings: SavingsResponse | null;
  unranked_reason: string | null;
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
  // "What you pay now" then "this offer" as smells for the simulated fly brain, whose spikes give the fruit fly's
  // opinion (features/brainview/opinion). Null when there is no baseline to compare the offer against.
  fly_opinion_stimulus: BrainStimulus | null;
}

// The task behind the listing, as its poster sees it (backend api/inbox/schemas.py InboxTaskSummary).
export interface InboxTaskSummary {
  id: string;
  origin: 'rebid' | 'new' | 'split';
  state: string;
  accepted_challenge_id: string | null;
  // False once the poster accepted an offer: the bidder owns the task.
  is_owned_by_you: boolean;
}

export interface InboxResponse {
  challenges: InboxChallenge[];
  bidding_mode: string;
  current_scope_version_number: number;
  // The stored listing record; visibility is "private" once unpublished, while its offers are kept.
  listing: PublicListingProjection;
  task?: InboxTaskSummary | null;
}

export interface ComparisonRow {
  challenge_id: string | null;
  challenger_name: string;
  is_incumbent: boolean;
  // Null only on the baseline row of a new task with no budget.
  normalized_price_minor: number | null;
  price_currency: string;
  scope_completeness: number;
  missing_items: string[];
  added_items: string[];
  unstated_items: string[];
  // The incumbent row reports the current version; an offer reports the version it answered.
  answered_scope_version_number: number;
  is_current_scope_version: boolean;
  baseline_monthly_minor: number | null;
  baseline_currency: string;
  // Null for the incumbent row and for unranked offers; unranked_reason explains the latter.
  savings: SavingsResponse | null;
  unranked_reason: string | null;
  provenance: string;
}

export interface ComparisonResponse {
  rows: ComparisonRow[];
  current_scope_version_number: number;
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
  scope_extras: string[];
  setup_fee_minor: number;
  // Null means the challenger didn't say, which the drawer shows as "Not stated".
  taxes_included: boolean | null;
  supplies_included: boolean | null;
  minimum_term: string | null;
  other_conditions: string | null;
  message_to_owner: string | null;
  availability: string | null;
  offer_expiry: string | null;
  site_visit_required: boolean;
  // The offer's current per-requirement answers; empty on a listing scoped without requirement rows.
  requirement_responses: RequirementAnswerItem[];
  provenance: string;
  submitted_at: string;
  revised_at: string | null;
}

export interface OwnerChallengeListResponse {
  challenges: OwnerChallenge[];
  message?: string | null;
}
