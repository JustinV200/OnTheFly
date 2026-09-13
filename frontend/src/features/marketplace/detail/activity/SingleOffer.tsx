/* The one-offer state of the open-bidding panel: a single dot on a chart says nothing, so the offer is shown as a row
   of facts instead, with its scope coverage beside the price and its provenance label. */
import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../../shared/format/formatTimestamp';
import { answeredScopeLabel } from '../../../../shared/offers/answeredScopeLabel';
import { ProvenanceBadge } from '../../../../shared/provenance/ProvenanceBadge';
import { ScopeCompleteness } from '../../leaderboard/ScopeCompleteness';
import type { LeaderboardEntry } from '../../types';
import './OfferActivity.css';

interface SingleOfferProps {
  entry: LeaderboardEntry;
  currentScopeVersion: number;
}

/** Render the only public offer so far. */
export function SingleOffer({ entry, currentScopeVersion }: SingleOfferProps): JSX.Element {
  return (
    <div className="single-offer">
      <p className="single-offer__title">One public offer so far</p>
      <div className="single-offer__facts">
        <span className="single-offer__price">
          <MoneyDisplay amountMinor={entry.normalized_price_minor} currency={entry.price_currency} />
          <span className="single-offer__period"> /mo</span>
        </span>
        <ScopeCompleteness score={entry.scope_completeness} />
        <ProvenanceBadge kind="offer" value={entry.provenance} />
      </div>
      <p className="ui-text-muted ui-text-sm">
        Submitted {formatTimestamp(entry.submitted_at)}
        {entry.is_current_scope_version ? '' : ` · ${answeredScopeLabel(entry.answered_scope_version_number, currentScopeVersion)}`}
        . The chart starts when a second offer arrives.
      </p>
    </div>
  );
}
