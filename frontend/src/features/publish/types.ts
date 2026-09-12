/* Declares publish-flow request and response types.
   These stay local to the publish feature because the UI shapes are feature-specific. */
export interface PublishableExpense {
  id: string;
  vendor: string;
  category: string | null;
}

export interface ListingDraftResponse {
  listing_id: string;
  expense_id: string;
  scope_version_id: string;
  visibility: string;
}

export interface PublicListingProjection {
  id: string;
  expense_id: string;
  category: string;
  scope_summary: string;
  price_minor: number;
  price_currency: string;
  billing_cadence: string;
  service_area_approximate: string;
  bidding_mode: string;
  challenge_deadline: string | null;
  incumbent_vendor_name: string | null;
  show_exact_address: boolean;
  visibility: string;
  published_at: string | null;
}

export interface ListingPreviewResponse {
  payload_hash: string;
  projection: PublicListingProjection;
}
