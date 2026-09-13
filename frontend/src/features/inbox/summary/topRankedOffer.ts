/* Picks the offer the server ranked first, for the summary strip's headline savings.
   The inbox list already arrives in the server's comparison order (scope covered first, then price; earlier-scope offers,
   then unranked ones last), so the first offer carrying a savings figure is the top-ranked one. Nothing is compared here:
   the top-ranked offer is not necessarily the one with the biggest savings, and the strip says "top-ranked" for that reason. */
import type { InboxChallenge } from '../types';

/** Return the first ranked offer with a savings figure, or null when no offer could be ranked. */
export function topRankedOffer(offers: InboxChallenge[]): InboxChallenge | null {
  return offers.find((offer) => offer.unranked_reason === null && offer.savings !== null) ?? null;
}
