/* The Offers page's summary strip: what you pay now, how many offers arrived, the top-ranked potential savings, and the
   listing's controls. Tiles show server figures only; the price keeps the period it is billed on. */
import type { ReactNode } from 'react';

import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
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
      <Card as="div" className="inbox-summary__tile">
        <Stat
          caption="Your confirmed current price"
          label="What you pay now"
          size="lg"
          unit={cadenceSuffix(listing.billing_cadence)}
          value={<MoneyDisplay amountMinor={listing.price_minor} currency={listing.price_currency} />}
        />
      </Card>
      <Card as="div" className="inbox-summary__tile">
        <Stat caption="New offers appear automatically" label="Offers" size="lg" value={offers.length} />
      </Card>
      <div className="inbox-summary__savings">
        <TopSavingsTile offers={offers} onOpenOffer={onOpenOffer} />
      </div>
      <div className="inbox-summary__controls">{controls}</div>
    </section>
  );
}
