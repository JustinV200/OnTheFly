/* Declares challenge submission types local to the challenge feature. */
export type BiddingModeValue = 'sealed' | 'open';

// One requirement answered by an offer (backend services/challenges/requirement_responses.py).
export interface RequirementResponsePayload {
  requirement_key: string;
  is_included: boolean;
  note: string | null;
}

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
  // Required, one per requirement, when the listing is scoped as requirement rows; omitted otherwise.
  requirement_responses?: RequirementResponsePayload[];
}

// One stored version of the acting business's own offer. A revision replaces every one of these terms,
// so the form prefills from them rather than starting blank (offerToFormFields.ts).
export interface StoredOffer {
  id: string;
  listing_id: string;
  bidding_mode_at_submission: string;
  price_minor: number;
  price_currency: string;
  billing_frequency: string;
  scope_included: string[];
  scope_excluded: string[];
  scope_extras: string[];
  setup_fee_minor: number;
  supplies_included: boolean | null;
  taxes_included: boolean | null;
  minimum_term: string | null;
  other_conditions: string | null;
  availability: string | null;
  offer_expiry: string | null;
  site_visit_required: boolean;
  message_to_owner: string | null;
  provenance: string;
  submitted_at: string;
  revised_at: string | null;
  // The stored version's per-requirement answers; empty on a listing without requirement rows.
  requirement_responses?: RequirementResponsePayload[];
}

// POST /api/listings/{id}/challenges: the version just stored. It always answers the listing's current scope.
export type ChallengeResponse = StoredOffer;

// GET /api/listings/{id}/my-offer: the acting business's own offer, loaded when the page opens.
export interface OwnOffer extends StoredOffer {
  // False when the owner re-scoped the listing after this version was made.
  answers_current_scope: boolean;
}

export interface OwnOfferResponse {
  offer: OwnOffer | null;
  message: string | null;
}
