/* The pinned first row of the ranked list: what the owner pays now, the baseline every offer below is measured against.
   Its monthly figure is the server's incumbent row from the comparison endpoint; the frontend never converts a
   quarterly or weekly price to monthly itself, so while that row is missing the cell says so instead. */
import { ListedPrice } from '../../../shared/components/ListedPrice';
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { cadenceSuffix } from '../../../shared/market';
import { Badge, Skeleton } from '../../../shared/ui';
import type { PublicListingProjection } from '../../publish/types';
import type { ComparisonRow } from '../types';

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
          {listing.expense_id ? 'Your current price' : 'Public listing'}: <ListedPrice amountMinor={listing.price_minor} currency={listing.price_currency} />{' '}
          {listing.price_minor === null ? '(your stated price stays private)' : cadenceSuffix(listing.billing_cadence)}
        </div>
      </td>
      <td className="ranked-offers__block" data-label="Scope covered">
        <span className="ranked-offers__muted">Your full scope, v{currentScopeVersionNumber}</span>
      </td>
      <td className="ui-num" data-label="Monthly">
        {incumbent && incumbent.normalized_price_minor === null ? (
          <span className="ranked-offers__muted">No budget stated</span>
        ) : incumbent && incumbent.normalized_price_minor !== null ? (
          <>
            <span className="ranked-offers__price"><MoneyDisplay amountMinor={incumbent.normalized_price_minor} currency={incumbent.price_currency} /></span>
            <span className="ranked-offers__period"> /mo</span>
          </>
        ) : isFailed ? (
          <span className="ranked-offers__muted">Monthly figure unavailable</span>
        ) : (
          <span role="status"><Skeleton width="5rem" /><span className="ui-visually-hidden">Loading the monthly figure</span></span>
        )}
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
