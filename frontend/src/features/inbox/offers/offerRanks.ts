/* Numbers each offer by its position in the server's order, restarting where the server starts a separately ranked group.
   It only counts positions; it never compares prices or scope (the backend's comparison/ordering.py decides the order). */

// The fields that decide which ranked group a row belongs to, as on shared/offers/offerGroups.
interface RankableOffer {
  is_current_scope_version: boolean;
  unranked_reason: string | null;
}

/** Return a 1-based rank per row (current-scope offers, then earlier-scope offers counted from 1 again), null when unranked. */
export function offerRanks(offers: RankableOffer[]): Array<number | null> {
  let currentCount = 0;
  let earlierCount = 0;
  return offers.map((offer) => {
    if (offer.unranked_reason !== null) {
      return null;
    }
    if (offer.is_current_scope_version) {
      currentCount += 1;
      return currentCount;
    }
    earlierCount += 1;
    return earlierCount;
  });
}
