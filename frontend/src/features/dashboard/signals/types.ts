/* Declares the owner-only spend-signals report returned by /api/spend-signals/:expenseId. */
import type { FlyBrainAttribution } from '../../../shared/flybrain/types';

export type BaselineBasis = 'current_price_level' | 'average_of_charges';

export type NotAssessedReason =
  | 'cadence_not_recurring'
  | 'too_few_charges'
  | 'mixed_currency'
  | 'amounts_too_variable';

export type ChargeStatus = 'not_enough_history' | 'no_stable_pattern' | 'typical' | 'unusual';

export type NoveltyReason = 'amount_unlike_earlier_charges' | 'description_unlike_earlier_charges';

export interface BaselineExplanation {
  basis: BaselineBasis;
  amount_minor: number;
  currency: string;
  cadence: string;
  basis_started_at: string;
  supporting_transaction_ids: string[];
  excluded_one_off_transaction_ids: string[];
  excluded_unconfirmed_transaction_ids: string[];
}

export interface PriceLevelShift {
  transaction_id: string;
  changed_at: string;
  previous_amount_minor: number;
  new_amount_minor: number;
  change_basis_points: number;
}

export interface PendingPriceChange {
  transaction_ids: string[];
  first_seen_at: string;
  latest_amount_minor: number;
  level_amount_minor: number;
  change_basis_points: number;
}

/** Opening charge(s) whose amount no charge repeated before the price moved: not a confirmed change, not a one-off. */
export interface UnconfirmedEarlierPrice {
  transaction_ids: string[];
  first_seen_at: string;
  amount_minor: number;
}

export interface PriceLevelAnalysis {
  is_assessed: boolean;
  not_assessed_reason: NotAssessedReason | null;
  currency: string | null;
  current_level_amount_minor: number | null;
  current_level_started_at: string | null;
  current_level_transaction_ids: string[];
  one_off_transaction_ids: string[];
  shifts: PriceLevelShift[];
  pending_change: PendingPriceChange | null;
  unconfirmed_earlier_price: UnconfirmedEarlierPrice | null;
}

export interface ChargeNovelty {
  transaction_id: string;
  posted_at: string;
  amount_minor: number;
  currency: string;
  direction: string;
  status: ChargeStatus;
  prior_charge_count: number;
  amount_novelty: number | null;
  description_novelty: number | null;
  reasons: NoveltyReason[];
}

export interface SpendSignalsReport {
  expense_id: string;
  vendor: string;
  baseline: BaselineExplanation;
  price_levels: PriceLevelAnalysis;
  charges: ChargeNovelty[];
  unusual_charge_count: number;
  fly_brain: FlyBrainAttribution[];
}
