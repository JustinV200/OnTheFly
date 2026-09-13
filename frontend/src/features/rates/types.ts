/* Declares cost basis rate shapes (backend api/rates/router.py). Private to the acting business. */
export type RateKind = 'internal_cost' | 'current_contract_rate';

export interface CostBasisRate {
  id: string;
  task_id: string | null;
  kind: RateKind;
  labor_category: string;
  rate_minor_per_hour: number;
  currency: string;
  effective_date: string;
  // "fixture" (seeded demo data) or "owner-entered".
  provenance: string;
  created_at: string;
}

export interface RateListResponse {
  rates: CostBasisRate[];
}
