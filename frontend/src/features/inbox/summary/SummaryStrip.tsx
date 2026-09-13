/* The Offers page's summary strip: what you pay now, how many offers arrived, and the top-ranked potential savings, with
   the listing's controls as a band underneath. Tiles show server figures only; the price keeps the period it is billed on. */
import type { ReactNode } from 'react';

import { ListedPrice } from '../../../shared/components/ListedPrice';
import { cadenceSuffix } from '../../../shared/market';
import { Card, Stat } from '../../../shared/ui';
import type { PublicListingProjection } from '../../publish/types';
import type { InboxChallenge } from '../types';
import { TopSavingsTile } from './TopSavingsTile';
import './SummaryStrip.css';

interface SummaryStripProps {
  listing: PublicListingProjection;
  offers: InboxChallenge[];
  onOpenOffer: (challengeId: string) => void;
  // The controls card, which owns its own requests.
  controls: ReactNode;
}

/** Render the summary tiles and the controls card. */
export function SummaryStrip({ listing, offers, onOpenOffer, controls }: SummaryStripProps): JSX.Element {
  return (
    <section aria-label="Summary" className="inbox-summary">
      <div className="inbox-summary__tiles">
        <Card as="div" className="inbox-summary__tile">
          <Stat
            caption={listing.expense_id ? 'Your confirmed current price' : listing.price_minor === null ? 'Hidden on the public listing' : 'Shown on the public listing'}
            label={listing.expense_id ? 'What you pay now' : 'Listed price'}
            size="xl"
            unit={listing.price_minor === null ? undefined : cadenceSuffix(listing.billing_cadence)}
            value={<ListedPrice amountMinor={listing.price_minor} currency={listing.price_currency} />}
          />
        </Card>
        <Card as="div" className="inbox-summary__tile">
          <Stat caption="New offers appear automatically" label="Offers" size="xl" value={offers.length} />
        </Card>
        <div className="inbox-summary__savings">
          <TopSavingsTile offers={offers} onOpenOffer={onOpenOffer} />
        </div>
      </div>
      {controls}
    </section>
  );
}
