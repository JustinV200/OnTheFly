/* The pinned first row of the ranked list: what the owner pays now, the baseline every offer below is measured against.
   Its price is the listing's own, in the listing's billing period. Only when the listing hides its price does the cell fall
   back to the server's per-month figure from the comparison endpoint, labelled as that; the frontend never converts a
   price between periods itself, so while that row is missing the cell says so instead. */
import { Badge, Skeleton } from '../../../../shared/ui';
import type { PublicListingProjection } from '../../../publish/types';
import type { ComparisonRow } from '../../types';
import { BilledPrice } from './BilledPrice';

interface BaselineRowProps {
  listing: PublicListingProjection;
  // The comparison's incumbent row; null while it loads or when it failed (isFailed then says which).
  incumbent: ComparisonRow | null;
  isFailed: boolean;
  currentScopeVersionNumber: number;
}

/** Render the baseline row inside the ranked list's tbody. */
export function BaselineRow({ listing, incumbent, isFailed, currentScopeVersionNumber }: BaselineRowProps): JSX.Element {
  return (
    <tr className="ranked-offers__baseline">
      <td className="ranked-offers__challenger">
        <div className="ranked-offers__who">
          {/* A rebid compares against observed spend; a new task against its budget, a piece against its cut. */}
          <span className="ranked-offers__baseline-name">{listing.expense_id ? 'What you pay now' : 'Your listed price'}</span>
          <Badge tone="neutral">Baseline</Badge>
        </div>
        <div className="ranked-offers__when">
          {listing.expense_id ? 'Your confirmed current price' : listing.price_minor === null ? 'Hidden on the public listing' : 'Shown on the public listing'}
        </div>
      </td>
      <td className="ranked-offers__block" data-label="Scope covered">
        <span className="ranked-offers__muted">Your full scope, v{currentScopeVersionNumber}</span>
      </td>
      <td className="ui-num" data-label="Price">
        <BaselinePrice incumbent={incumbent} isFailed={isFailed} listing={listing} />
      </td>
      <td className="ranked-offers__not-applicable" data-label="Potential savings">
        <span className="ranked-offers__muted">Offers are measured against this</span>
      </td>
      <td className="ranked-offers__block ranked-offers__not-applicable" data-label="Evidence">
        <span className="ranked-offers__muted">Not applicable</span>
      </td>
      <td className="ranked-offers__action" />
    </tr>
  );
}

function BaselinePrice({ listing, incumbent, isFailed }: Omit<BaselineRowProps, 'currentScopeVersionNumber'>): JSX.Element {
  if (listing.price_minor !== null) {
    return <BilledPrice amountMinor={listing.price_minor} cadence={listing.billing_cadence} currency={listing.price_currency} />;
  }
  if (incumbent && incumbent.normalized_price_minor !== null) {
    return <BilledPrice amountMinor={incumbent.normalized_price_minor} cadence={null} currency={incumbent.price_currency} />;
  }
  if (incumbent) {
    return <span className="ranked-offers__muted">No budget stated</span>;
  }
  if (isFailed) {
    return <span className="ranked-offers__muted">Price unavailable</span>;
  }
  return <span role="status"><Skeleton width="5rem" /><span className="ui-visually-hidden">Loading your price</span></span>;
}
