/* Declares publish-flow request and response types.
   These stay local to the publish feature because the UI shapes are feature-specific. */
export interface PublishableExpense {
  id: string;
  vendor: string;
  category: string | null;
  cadence: string;
  amount_minor_per_period: number;
  currency: string;
  visibility: string;
  // Financial provenance of the transactions behind the baseline: production | sandbox | imported | fixture.
  provenance: string[];
}

export interface PublishChoices {
  bidding_mode: 'sealed' | 'open';
  show_incumbent_vendor: boolean;
  show_exact_address: boolean;
}

export interface ListingDraftResponse {
  listing_id: string;
  expense_id: string;
  scope_version_id: string;
  visibility: string;
}

// One requirement as bidders see it (roadmap 12). Offers answer requirements by key.
export interface PublicRequirement {
  key: string;
  text: string;
  priority: string;
  labor_category: string | null;
  // Hours per the listing's billing period; null when the poster left the estimate unanswered.
  hours: number | null;
}

export interface PublicConstraint {
  kind: string;
  value: string;
}

export interface PublicScopeField {
  label: string;
  value: string;
}

export interface PublicListingProjection {
  id: string;
  // Only a rebid of observed spend has an expense; a new task or a piece has none.
  expense_id: string | null;
  category: string;
  scope_summary: string;
  // The structured requirements offers are scored against; null expectations were not stated by the owner.
  required_tasks: string[];
  visit_frequency: string | null;
  supplies_included: boolean | null;
  equipment_included: boolean | null;
  taxes_included: boolean | null;
  // Null when the poster hides the price (the default for new tasks and pieces): show "Price not disclosed".
  price_minor: number | null;
  price_currency: string;
  billing_cadence: string;
  service_area_approximate: string;
  bidding_mode: string;
  challenge_deadline: string | null;
  incumbent_vendor_name: string | null;
  show_exact_address: boolean;
  visibility: string;
  published_at: string | null;
  // Roadmap 12 additions; older payloads read as empty lists, no title, and a disclosed price.
  title?: string | null;
  requirements?: PublicRequirement[];
  constraints?: PublicConstraint[];
  scope_fields?: PublicScopeField[];
  // A piece split off an accepted task: payment depends on the business above.
  is_subcontract?: boolean;
  price_disclosed?: boolean;
}

export interface ListingPreviewResponse {
  payload_hash: string;
  projection: PublicListingProjection;
}
