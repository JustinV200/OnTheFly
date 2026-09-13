/* Words for offers made while a now-open listing was sealed. They stay sealed (a mode change is never retroactive), so
   they count toward the total but never get a price on a public view. */

/** Return the sentence for a positive sealed-offer count. */
export function sealedOfferNote(sealedCount: number): string {
  const isOne = sealedCount === 1;
  return `${sealedCount} ${isOne ? 'offer was' : 'offers were'} made while bidding was sealed and ${isOne ? 'stays' : 'stay'} sealed: counted, never priced here.`;
}
