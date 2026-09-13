/* Step 4 of the offer trace: the listing the scope was published on, its published price, visibility, and bidding mode.
   It is titled by the task's title when one has loaded, else by category, the way the listing's own market card is. */
import { BiddingModePill } from '../../../../shared/components/BiddingModePill';
import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { categoryLabel } from '../../../../shared/format/categoryLabel';
import { formatTimestamp } from '../../../../shared/format/formatTimestamp';
import { cadenceSuffix } from '../../../../shared/market';
import { Badge, Icon, Stat } from '../../../../shared/ui';
import { TraceStep } from '../../chain/TraceStep';
import type { OfferTrace } from '../../types';

interface ListingStepProps {
  listing: OfferTrace['listing'];
  // The task's title; null while it loads, if it failed to, or for a listing from before tasks.
  title: string | null;
}

/** Render the listing step. Anything but "public" is named as the listing's state now, never shown as public. */
export function ListingStep({ listing, title }: ListingStepProps): JSX.Element {
  const isPublic = listing.visibility === 'public';
  return (
    <TraceStep
      badges={(
        <>
          <Badge icon={<Icon name={isPublic ? 'eye' : 'lock'} />} tone={isPublic ? 'success' : 'private'}>
            {isPublic ? 'Public' : `Now ${listing.visibility}`}
          </Badge>
          <BiddingModePill mode={listing.bidding_mode} />
        </>
      )}
      leadsTo="The price this offer is measured against"
      step={4}
      title={`Listing: ${title || categoryLabel(listing.category)}`}
    >
      <Stat
        caption={listing.published_at ? `Published ${formatTimestamp(listing.published_at)}` : undefined}
        label="Published price"
        size="md"
        unit={cadenceSuffix(listing.billing_cadence)}
        value={<MoneyDisplay amountMinor={listing.price_minor} currency={listing.price_currency} />}
      />
    </TraceStep>
  );
}
