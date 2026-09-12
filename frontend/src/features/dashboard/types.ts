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
  visibility: string;
  is_eligible: boolean;
  eligibility_reason: string;
  is_publishable: boolean;
}

export interface ExpenseTransaction {
  id: string;
  raw_description: string;
  normalized_vendor: string | null;
  amount_minor: number;
  currency: string;
  posted_at: string;
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
