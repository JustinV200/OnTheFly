/* Labels a listing's bidding mode. Anything but an explicit "open" reads as sealed, the safe fallback.
   The lock / eye icons reinforce the words; the words alone say which mode is in force. */
import { Badge, Icon } from '../ui';

/** Render "Open bidding" or "Sealed bidding" with what each means on hover. */
export function BiddingModePill({ mode }: { mode: string }): JSX.Element {
  return mode === 'open' ? (
    <Badge icon={<Icon name="eye" />} title="Offer prices and scope are public, anonymized. Bidder identities never are." tone="info">
      Open bidding
    </Badge>
  ) : (
    <Badge icon={<Icon name="lock" />} title="Only the number of offers is public. Prices stay with the business that posted the listing." tone="private">
      Sealed bidding
    </Badge>
  );
}
