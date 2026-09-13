/* A readable rendering of one public listing projection, field for field, for the owner's preview and confirmation.
   Every value comes from the projection the API returned; nothing is added from the private expense. */
import { BiddingModePill } from '../../../shared/components/BiddingModePill';
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { categoryLabel } from '../../../shared/format/categoryLabel';
import { describeScopeExpectations } from '../../../shared/format/describeScopeExpectations';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Badge, Cluster, Stack, Stat } from '../../../shared/ui';
import type { PublicListingProjection } from '../types';
import './PublicListingSummary.css';

interface PublicListingSummaryProps {
  listing: PublicListingProjection;
}

/** Render the category, price, and each disclosed field of a public listing. */
export function PublicListingSummary({ listing }: PublicListingSummaryProps): JSX.Element {
  return (
    <Stack gap={4}>
      <Cluster align="start" justify="between">
        <h3 className="publish-summary__category">{categoryLabel(listing.category)}</h3>
        <BiddingModePill mode={listing.bidding_mode} />
      </Cluster>
      <Stat
        caption={<ProvenanceBadge kind="offer" value="incumbent_baseline" />}
        label="Currently pays"
        size="xl"
        unit={`/ ${listing.billing_cadence}`}
        value={<MoneyDisplay amountMinor={listing.price_minor} currency={listing.price_currency} />}
      />
      <dl className="publish-summary__fields">
        <div className="publish-summary__row">
          <dt>Scope</dt>
          <dd>{listing.scope_summary}</dd>
        </div>
        <div className="publish-summary__row">
          <dt>Requested terms</dt>
          <dd>{describeScopeExpectations(listing)}</dd>
        </div>
        <div className="publish-summary__row">
          <dt>Area</dt>
          <dd>{listing.service_area_approximate || 'not specified'}</dd>
        </div>
        <div className="publish-summary__row">
          <dt>Bidding</dt>
          <dd>{listing.bidding_mode}</dd>
        </div>
        <div className="publish-summary__row">
          <dt>Offer deadline</dt>
          <dd>{listing.challenge_deadline ? formatTimestamp(listing.challenge_deadline) : 'none set'}</dd>
        </div>
        <div className="publish-summary__row">
          <dt>Current vendor</dt>
          <dd>
            {listing.incumbent_vendor_name ? (
              <Cluster gap={2}>
                <span>{listing.incumbent_vendor_name}</span>
                <Badge tone="warning">Named publicly</Badge>
              </Cluster>
            ) : (
              'hidden'
            )}
          </dd>
        </div>
      </dl>
    </Stack>
  );
}
