/* Declares inbox and comparison response shapes local to the inbox feature. */
export interface SavingsResponse {
  annual_recurring_savings_minor: number;
  first_year_net_savings_minor: number;
  is_provisional: boolean;
  assumptions: string[];
  label: string;
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
  evidence_status: string;
  platform_check_status: string;
  identity_check_status: string;
  registry_check_status: string;
  provenance: string;
  bidding_mode_at_submission: string;
}

export interface InboxResponse {
  challenges: InboxChallenge[];
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
