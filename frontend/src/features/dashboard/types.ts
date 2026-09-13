/* Declares dashboard-specific API response shapes for expense screens.
   These types stay with the dashboard feature instead of leaking globally. */
export interface Expense {
  id: string;
  vendor: string;
  category: string | null;
  cadence: string;
  recurrence_confidence: number;
  amount_minor_per_period: number;
  currency: string;
  annualized_amount_minor: number;
  period_count: number;
  first_seen: string;
  last_seen: string;
  visibility: string;
  is_eligible: boolean;
  eligibility_reason: string;
  is_publishable: boolean;
  // Present once a listing was drafted; kept after unpublishing so retained offers stay reachable.
  listing_id: string | null;
  // The REBID task this business opened on the expense, if any, so Spend can open it instead of starting another, and
  // its lifecycle state: once "accepted", the expense's own visibility no longer describes the listing.
  task_id: string | null;
  task_state: string | null;
  // Financial provenance of the transactions behind this row: production | sandbox | imported | fixture.
  provenance: string[];
}

export interface ExpenseTransaction {
  id: string;
  raw_description: string;
  normalized_vendor: string | null;
  amount_minor: number;
  currency: string;
  posted_at: string;
  status: string;
  direction: string;
  source_type: string;
  is_excluded: boolean;
  excluded_reason: string | null;
}

export interface ExpenseDetail extends Expense {
  supporting_transactions: ExpenseTransaction[];
}

export interface ExpenseListResponse {
  expenses: Expense[];
  message?: string | null;
}
