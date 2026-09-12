/* Declares challenge submission types local to the challenge feature. */
export type BiddingModeValue = 'sealed' | 'open';

export interface ChallengePayload {
  // The terms the challenger was shown; the server rejects the offer (409) if they changed since.
  acknowledged_bidding_mode: BiddingModeValue;
  price_minor: number;
  billing_frequency: string;
  scope_included: string[];
  scope_excluded: string[];
  scope_extras: string[];
  setup_fee_minor: number;
  supplies_included: boolean | null;
  taxes_included: boolean | null;
  minimum_term: string | null;
  availability: string | null;
  site_visit_required: boolean;
  message_to_owner: string | null;
}

export interface ChallengeResponse {
  id: string;
  listing_id: string;
  bidding_mode_at_submission: string;
  price_minor: number;
  price_currency: string;
  billing_frequency: string;
  provenance: string;
  submitted_at: string;
  revised_at: string | null;
}
