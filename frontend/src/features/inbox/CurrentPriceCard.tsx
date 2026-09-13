/* The inbox's headline: the price the owner pays now, which every offer below is measured against, and how many offers arrived. */
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { Card, Grid, Stat } from '../../shared/ui';
import type { PublicListingProjection } from '../publish/types';

interface CurrentPriceCardProps {
  listing: PublicListingProjection;
  offerCount: number;
}

/** Render the listing's confirmed current price and the number of offers received. */
export function CurrentPriceCard({ listing, offerCount }: CurrentPriceCardProps): JSX.Element {
  return (
    <Card title="What you pay now">
      <Grid gap={5} minItemWidth="10rem">
        <Stat
          caption="Your confirmed current price"
          label="You pay"
          size="xl"
          unit={`/ ${listing.billing_cadence}`}
          value={<MoneyDisplay amountMinor={listing.price_minor} currency={listing.price_currency} />}
        />
        <Stat caption="New offers appear here automatically" label="Offers received" size="xl" value={offerCount} />
      </Grid>
    </Card>
  );
}
