/* Declares the offer trace response (backend app/services/trace/types.py). */
export interface OfferTrace {
  savings: {
    label: string;
    currency: string;
    baseline_monthly_minor: number;
    offer_monthly_minor: number;
    annual_recurring_savings_minor: number;
    first_year_net_savings_minor: number;
    is_provisional: boolean;
    assumptions: string[];
  };
  offer: {
    challenge_id: string;
    challenger_name: string;
    provenance: string;
    bidding_mode_at_submission: string;
    price_minor: number;
    price_currency: string;
    billing_frequency: string;
    normalized_monthly_minor: number;
    setup_fee_minor: number;
    scope_included: string[];
    scope_excluded: string[];
    scope_extras: string[];
    scope_completeness: number;
    missing_items: string[];
    unstated_items: string[];
    submitted_at: string;
    revised_at: string | null;
    revision_count: number;
  };
  scope_version: {
    id: string;
    version_number: number;
    created_at: string;
    is_listing_current_version: boolean;
    service_area: string | null;
    location_approximate: string | null;
    square_footage: number | null;
    visit_frequency: string | null;
    bathroom_count: number | null;
    required_tasks: string[];
    supplies_included: boolean | null;
    equipment_included: boolean | null;
    taxes_included: boolean | null;
    current_price_minor: number | null;
    current_price_currency: string;
    billing_cadence: string | null;
    challenge_deadline: string | null;
  };
  listing: {
    id: string;
    visibility: string;
    bidding_mode: string;
    category: string;
    price_minor: number;
    price_currency: string;
    billing_cadence: string;
    published_at: string | null;
    current_scope_version_number: number;
  };
  baseline: {
    source: 'owner_confirmed_scope' | 'transaction_baseline';
    amount_minor: number;
    currency: string;
    cadence: string;
    monthly_minor: number;
    confirmed_on_scope_version: number | null;
  };
  expense: {
    id: string;
    vendor: string;
    category: string | null;
    cadence: string;
    amount_minor_per_period: number;
    annualized_amount_minor: number;
    currency: string;
    period_count: number;
    recurrence_confidence: number;
    first_seen: string;
    last_seen: string;
    provenance: string[];
  };
  transactions: {
    id: string;
    posted_at: string;
    raw_description: string;
    amount_minor: number;
    currency: string;
    source_type: string;
    is_excluded: boolean;
    excluded_reason: string | null;
  }[];
}
