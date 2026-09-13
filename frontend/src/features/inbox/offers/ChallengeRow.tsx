/* Renders one owner-visible offer: who, when, under which terms, scope gaps, price, savings, and, in a row beneath, evidence.
   Scope deltas are shown before price to avoid misleading comparisons, and are measured against the scope version the offer answered.
   Evidence gets its own full-width row so every check, including those not run, stays visible without a very tall row. */
import { BiddingModePill } from '../../../shared/components/BiddingModePill';
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { Pill } from '../../../shared/components/Pill';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { answeredScopeLabel } from '../../../shared/offers/answeredScopeLabel';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Cluster, Icon } from '../../../shared/ui';
import { EvidenceChecks } from '../evidence/EvidenceChecks';
import { OfferSavings } from '../savings/OfferSavings';
import type { InboxChallenge } from '../types';
import { ScopeDeltaBadge } from './ScopeDeltaBadge';
import './ChallengeRow.css';

// The offers table's column count, which group heading rows and the evidence row span.
export const CHALLENGE_ROW_COLUMN_COUNT = 4;

interface ChallengeRowProps {
  challenge: InboxChallenge;
  currentScopeVersionNumber: number;
}

/** Render one offer as a row of terms followed by its evidence row, inside the offers table's tbody. */
export function ChallengeRow({ challenge, currentScopeVersionNumber }: ChallengeRowProps): JSX.Element {
  const hasDeltas = challenge.missing_items.length + challenge.unstated_items.length + challenge.added_items.length > 0;
  const isEarlierScope = !challenge.is_current_scope_version;

  return (
    <>
      <tr className="inbox-offer__row">
        <td>
          <div className="inbox-offer__name">{challenge.challenger_name}</div>
          <div className="ui-text-sm ui-text-muted">
            {challenge.revised_at ? `revised ${formatTimestamp(challenge.revised_at)}` : `received ${formatTimestamp(challenge.submitted_at)}`}
          </div>
          <Cluster className="inbox-offer__badges" gap={1}>
            <ProvenanceBadge kind="offer" value={challenge.provenance} />
            <BiddingModePill mode={challenge.bidding_mode_at_submission} />
            {isEarlierScope ? (
              <Pill title="Scored against the scope this offer answered. It hasn't been revised since you changed the scope." tone="warning">
                {answeredScopeLabel(challenge.answered_scope_version_number, currentScopeVersionNumber)}
              </Pill>
            ) : null}
          </Cluster>
        </td>
        <td>
          <div className="inbox-offer__completeness">
            {Math.round(challenge.scope_completeness * 100)}% of scope{isEarlierScope ? ` v${challenge.answered_scope_version_number}` : ''}
          </div>
          {hasDeltas ? (
            <Cluster className="inbox-offer__badges" gap={1}>
              {challenge.missing_items.map((item) => <ScopeDeltaBadge item={item} key={`m-${item}`} kind="missing" />)}
              {challenge.unstated_items.map((item) => <ScopeDeltaBadge item={item} key={`u-${item}`} kind="unstated" />)}
              {challenge.added_items.map((item) => <ScopeDeltaBadge item={item} key={`a-${item}`} kind="added" />)}
            </Cluster>
          ) : (
            <div className="inbox-offer__covered">
              <Icon name="check" size={14} />
              {isEarlierScope ? `Covers scope v${challenge.answered_scope_version_number} as requested` : 'Covers the requested scope'}
            </div>
          )}
        </td>
        <td className="ui-num">
          <div className="inbox-offer__price">
            <MoneyDisplay amountMinor={challenge.normalized_price_minor} currency={challenge.price_currency} />
          </div>
          <div className="ui-text-sm ui-text-muted">/ month</div>
        </td>
        <td><OfferSavings offer={challenge} /></td>
      </tr>
      <tr className="inbox-offer__evidence-row">
        <td colSpan={CHALLENGE_ROW_COLUMN_COUNT}>
          <EvidenceChecks checks={challenge.evidence_checks} rollup={challenge.evidence_rollup} />
        </td>
      </tr>
    </>
  );
}
