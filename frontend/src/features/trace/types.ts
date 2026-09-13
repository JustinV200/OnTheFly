/* Declares the offer trace response (backend app/services/trace/types.py). */
import type { BrainStimulus } from '../../shared/flybrain/live';
import type { FlyBrainAttribution } from '../../shared/flybrain/types';
import type { RequirementAnswerItem } from '../../shared/offers/RequirementAnswerList';
import type { PublicRequirement } from '../publish/types';

export interface OfferTrace {
  // Null when the offer is unranked: there is no figure to trace, and offer.unranked_reason says why.
  // The baseline is the price confirmed on the scope version the offer answered, not necessarily today's.
  savings: {
    label: string;
    currency: string;
    baseline_monthly_minor: number;
    offer_monthly_minor: number;
    annual_recurring_savings_minor: number;
    first_year_net_savings_minor: number;
    is_provisional: boolean;
    assumptions: string[];
  } | null;
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
    // Its current per-requirement answers; empty on a listing scoped without requirement rows.
    requirement_responses: RequirementAnswerItem[];
    scope_completeness: number;
    missing_items: string[];
    unstated_items: string[];
    unranked_reason: string | null;
    submitted_at: string;
    revised_at: string | null;
    revision_count: number;
  };
  scope_version: {
    id: string;
    version_number: number;
    created_at: string;
    is_listing_current_version: boolean;
    // This version's own requirement rows, in the wording the offer answered; empty for an on-site scope.
    requirements: PublicRequirement[];
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
    // The listing's title; null for a listing from before tasks, which is named by its category.
    title: string | null;
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
  // Every row filed under the expense's vendor, not only the ones behind the baseline.
  transactions: {
    id: string;
    posted_at: string;
    raw_description: string;
    // Unsigned, as imported: direction carries the sign, so a refund credit has the same amount as a charge.
    amount_minor: number;
    currency: string;
    direction: string;
    status: string;
    source_type: string;
    is_excluded: boolean;
    excluded_reason: string | null;
    // Set by the server's baseline code; the page shows it and never re-derives the rule.
    counts_toward_baseline: boolean;
  }[];
  // The Compound Eye chose the counted rows; the backend lists it with its reason when it didn't run.
  fly_brain: FlyBrainAttribution[];
  // What the simulated fly brain view plays alongside the trace; null when the Compound Eye didn't run.
  brain_stimulus: BrainStimulus | null;
}
