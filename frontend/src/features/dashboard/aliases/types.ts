/* Declares vendor alias suggestion shapes returned by /api/vendor-aliases. */
import type { BrainStimulus } from '../../../shared/flybrain/live';
import type { FlyBrainAttribution } from '../../../shared/flybrain/types';

export interface VendorGroupSummary {
  expense_id: string;
  vendor: string;
  category: string | null;
  charge_count: number;
  amount_minor_per_period: number;
  cadence: string;
}

export interface VendorAliasSuggestion {
  alias: VendorGroupSummary;
  canonical: VendorGroupSummary;
  currency: string;
  name_similarity: number;
  shared_words: string[];
}

export interface VendorAliasListResponse {
  suggestions: VendorAliasSuggestion[];
  fly_brain: FlyBrainAttribution[];
  // What the simulated fly brain view plays alongside the suggestions; null when the name index didn't run.
  brain_stimulus: BrainStimulus | null;
}

export interface VendorAliasPair {
  alias_expense_id: string;
  canonical_expense_id: string;
}
