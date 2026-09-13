/* Declares the owner-visible listing facts My listings reads from GET /api/listings/{id}/inbox (backend api/inbox).
   Only the fields this page shows are declared; offer rows are read for their count alone, never their contents. */

/** The stored listing record the inbox returns; visibility reads "private" once unpublished, while offers are kept. */
export interface OwnerListingRecord {
  id: string;
  category: string;
  service_area_approximate: string;
  price_minor: number;
  price_currency: string;
  billing_cadence: string;
  bidding_mode: string;
  challenge_deadline: string | null;
  visibility: string;
  published_at: string | null;
}

export interface OwnerListingInbox {
  // Active offers on the listing; My listings only counts them.
  challenges: Array<{ challenge_id: string }>;
  bidding_mode: string;
  listing: OwnerListingRecord;
}
