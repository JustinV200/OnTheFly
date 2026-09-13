/* Declares the Ways to save response (backend api/savings/router.py and services/savings/view.py). Owner-only data. */

export type SavingsTier = 'potential_savings' | 'specialist_market' | 'needs_rates' | 'not_viable';

export interface AwardRecord {
  award_id: string;
  award_type: 'prime' | 'subaward';
  recipient_name: string;
  uei: string | null;
  amount_minor: number;
  currency: string;
  action_date: string | null;
  url: string | null;
}

export interface CardInputs {
  segment_key: string;
  labor_category: string;
  psc: string;
  naics: string;
  requirements: Array<{ key: string; text: string; hours: number | null; hours_status: string }>;
  rate: { labor_category: string; kind: string; rate_minor_per_hour: number | null; provenance: string | null; effective_date: string | null };
  cut_basis: {
    source: string;
    provenance: string;
    status: string;
    retrieved_at: string;
    matched_labor_categories: string[];
    p25_minor: number | null;
    median_minor: number | null;
    p75_minor: number | null;
    sample_size: number;
    limitations: string;
  };
  suppliers: {
    source: string;
    provenance: string;
    status: string;
    retrieved_at: string;
    psc: string;
    naics: string;
    place_of_performance: string | null;
    lookback_years: number;
    count: { distinct_uei_count: number; award_count: number; records_without_uei: number; prime_award_count: number; subaward_count: number };
    awards: AwardRecord[];
    limitations: string;
  };
  remainder_minor: number | null;
  constraint_kinds: string[];
}

export interface SavingsThresholds {
  min_basis_points: number;
  min_annual_minor: number;
  min_suppliers: number;
  lookback_years: number;
  max_suggested_pieces_per_task: number;
}

export interface SavingsCardView {
  id: string;
  status: 'suggested' | 'dismissed' | 'split' | 'stale';
  tier: SavingsTier;
  label: string;
  reasons: string[];
  labor_category: string;
  psc: string;
  naics: string;
  currency: string;
  billing_period: string;
  inputs: CardInputs;
  hours_total: number | null;
  keep_cost_minor: number | null;
  suggested_cut_minor: number | null;
  suggested_cut_low_minor: number | null;
  suggested_cut_high_minor: number | null;
  oversight_minor: number | null;
  modeled_savings_minor: number | null;
  modeled_savings_basis_points: number | null;
  annual_savings_minor: number | null;
  is_provisional: boolean;
  evidence_ids: string[];
  sources_not_checked: string[];
  thresholds: SavingsThresholds;
  computed_at: string;
}

export interface WaysToSaveResponse {
  task_id: string;
  market_data_source: string;
  cards: SavingsCardView[];
  untagged_requirements: Array<{ key: string; text: string }>;
  thresholds: SavingsThresholds;
  active_suggested_pieces: number;
  max_suggested_pieces: number;
}
