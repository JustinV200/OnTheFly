/* The price being challenged, as its listing publishes it: what the business pays now, the bidding mode, and the deadline.
   It sits beside the form on wide screens, so the reference price and the terms stay readable while the challenger types. */
import { BiddingModePill } from '../../../shared/components/BiddingModePill';
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import type { DeadlineDescription } from '../../../shared/format/describeDeadline';
import { Badge, Card, Stat } from '../../../shared/ui';
import type { PublicListingProjection } from '../../publish/types';

interface ChallengedPriceCardProps {
  listing: PublicListingProjection;
  deadline: DeadlineDescription;
}

/** Render the listing's published price as the page's headline figure, with its bidding mode and deadline. */
export function ChallengedPriceCard({ listing, deadline }: ChallengedPriceCardProps): JSX.Element {
  return (
    <Card actions={<BiddingModePill mode={listing.bidding_mode} />} title="The price you’re challenging">
      <Stat
        caption={(
          <>
            {/* Closed is said in words too; the badge only makes it harder to miss. */}
            {deadline.isClosed ? <Badge tone="danger">Closed</Badge> : null}
            <span>{deadline.text}</span>
          </>
        )}
        label="They currently pay"
        size="xl"
        unit={`/ ${listing.billing_cadence}`}
        value={<MoneyDisplay amountMinor={listing.price_minor} currency={listing.price_currency} />}
      />
    </Card>
  );
}
