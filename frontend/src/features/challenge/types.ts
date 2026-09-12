/* Declares challenge submission types local to the challenge feature. */
export interface ChallengePayload {
  price_minor: number;
  billing_frequency: string;
  scope_included: string[];
  scope_excluded: string[];
  scope_extras: string[];
  message_to_owner?: string;
}

export interface ChallengeResponse {
  id: string;
  listing_id: string;
  bidding_mode_at_submission: string;
  price_minor: number;
  price_currency: string;
  provenance: string;
}
