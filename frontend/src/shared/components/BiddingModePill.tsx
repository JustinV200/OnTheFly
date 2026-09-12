/* Labels a listing's bidding mode. Anything but an explicit "open" reads as sealed, the safe fallback. */
import { Pill } from './Pill';

/** Render "Open bidding" or "Sealed bidding" with what each means on hover. */
export function BiddingModePill({ mode }: { mode: string }): JSX.Element {
  return mode === 'open' ? (
    <Pill title="Offer prices and scope are public, anonymized. Challenger identities never are." tone="info">Open bidding</Pill>
  ) : (
    <Pill title="Only the number of offers is public. Prices stay with the owner." tone="private">Sealed bidding</Pill>
  );
}
