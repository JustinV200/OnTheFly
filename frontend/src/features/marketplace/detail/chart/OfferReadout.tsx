/* The line under the offer chart that spells out the dot being pointed at, tapped or focused, so the details are
   reachable by keyboard and touch, not only through a hover tooltip. Provenance stays beside the price. The price is the
   server's per-month figure and says so ("compared per month"), since the listing itself may be priced per year. */
import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../../shared/format/formatTimestamp';
import { answeredScopeLabel } from '../../../../shared/offers/answeredScopeLabel';
import { ProvenanceBadge } from '../../../../shared/provenance/ProvenanceBadge';
import type { LeaderboardEntry } from '../../types';
import './OfferChart.css';

interface OfferReadoutProps {
  // The offer in focus, or null for the hint.
  entry: LeaderboardEntry | null;
  currentScopeVersion: number;
}

/** Render the active offer's details, or a hint when none is active. Announced politely as it changes. */
export function OfferReadout({ entry, currentScopeVersion }: OfferReadoutProps): JSX.Element {
  return (
    <div aria-live="polite" className="offer-chart__readout">
      {entry ? (
        <>
          <strong className="offer-chart__readout-price">
            <MoneyDisplay amountMinor={entry.normalized_price_minor} currency={entry.price_currency} /> compared per month
          </strong>
          <span>{Math.round(entry.scope_completeness * 100)}% of scope</span>
          {entry.is_current_scope_version ? null : (
            <span className="ui-text-muted">{answeredScopeLabel(entry.answered_scope_version_number, currentScopeVersion)}</span>
          )}
          <span className="ui-text-muted">{formatTimestamp(entry.submitted_at)}</span>
          <ProvenanceBadge kind="offer" value={entry.provenance} />
        </>
      ) : (
        <span className="ui-text-muted">Point at, tap or tab to an offer to see its details.</span>
      )}
    </div>
  );
}
