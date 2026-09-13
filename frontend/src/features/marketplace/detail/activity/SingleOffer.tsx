/* The one-offer state of the open-bidding panel: a single dot on a chart says nothing, so the offer is shown as a row
   of facts instead, with its scope coverage beside the price and its provenance label. The public price is the server's
   per-month figure, labelled "compared per month" so it never reads as the listing's own period. */
import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../../shared/format/formatTimestamp';
import { perPeriodWords } from '../../../../shared/market';
import { answeredScopeLabel } from '../../../../shared/offers/answeredScopeLabel';
import { ProvenanceBadge } from '../../../../shared/provenance/ProvenanceBadge';
import { ScopeCompleteness } from '../../leaderboard/ScopeCompleteness';
import type { LeaderboardEntry } from '../../types';
import './OfferActivity.css';

interface SingleOfferProps {
  entry: LeaderboardEntry;
  currentScopeVersion: number;
  // The listing's billing cadence, named when it isn't monthly so the unit change is visible.
  listingCadence: string;
}

/** Render the only public offer so far. */
export function SingleOffer({ entry, currentScopeVersion, listingCadence }: SingleOfferProps): JSX.Element {
  return (
    <div className="single-offer">
      <p className="single-offer__title">One public offer so far</p>
      <div className="single-offer__facts">
        <span className="single-offer__price">
          <MoneyDisplay amountMinor={entry.normalized_price_minor} currency={entry.price_currency} />
          <span className="single-offer__period"> compared per month</span>
        </span>
        <ScopeCompleteness score={entry.scope_completeness} />
        <ProvenanceBadge kind="offer" value={entry.provenance} />
      </div>
      <p className="ui-text-muted ui-text-sm">
        Submitted {formatTimestamp(entry.submitted_at)}
        {entry.is_current_scope_version ? '' : ` · ${answeredScopeLabel(entry.answered_scope_version_number, currentScopeVersion)}`}
        .{listingCadence === 'monthly' ? '' : ` The server restates every offer per month to compare them; this listing is priced ${perPeriodWords(listingCadence)}.`}
        {' '}The chart starts when a second offer arrives.
      </p>
    </div>
  );
}
