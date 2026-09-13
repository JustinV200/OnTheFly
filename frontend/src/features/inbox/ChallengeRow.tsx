/* Renders one owner-visible offer row: who, when, under which terms, scope gaps, savings, and evidence.
   Scope deltas are shown before price to avoid misleading comparisons, and are measured against the scope version the offer answered. */
import { BiddingModePill } from '../../shared/components/BiddingModePill';
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { Pill } from '../../shared/components/Pill';
import { formatTimestamp } from '../../shared/format/formatTimestamp';
import { answeredScopeLabel } from '../../shared/offers/answeredScopeLabel';
import { ProvenanceBadge } from '../../shared/provenance/ProvenanceBadge';
import { EvidenceChecks } from './offers/EvidenceChecks';
import { OfferSavings } from './offers/OfferSavings';
import { ScopeDeltaBadge } from './ScopeDeltaBadge';
import type { InboxChallenge } from './types';

interface ChallengeRowProps {
  challenge: InboxChallenge;
  currentScopeVersionNumber: number;
}

/** Render one challenge row in the owner inbox table. */
export function ChallengeRow({ challenge, currentScopeVersionNumber }: ChallengeRowProps): JSX.Element {
  const hasDeltas = challenge.missing_items.length + challenge.unstated_items.length + challenge.added_items.length > 0;
  const isEarlierScope = !challenge.is_current_scope_version;

  return (
    <tr style={{ borderTop: '1px solid #e2e8f0', verticalAlign: 'top' }}>
      <td style={{ padding: '0.6rem 0.5rem 0.6rem 0' }}>
        <strong>{challenge.challenger_name}</strong>
        <div style={{ color: '#475569', fontSize: '0.85rem' }}>
          {challenge.revised_at ? `revised ${formatTimestamp(challenge.revised_at)}` : `received ${formatTimestamp(challenge.submitted_at)}`}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
          <ProvenanceBadge kind="offer" value={challenge.provenance} />
          <BiddingModePill mode={challenge.bidding_mode_at_submission} />
          {isEarlierScope ? (
            <Pill title="Scored against the scope this offer answered. It hasn't been revised since you changed the scope." tone="warning">
              {answeredScopeLabel(challenge.answered_scope_version_number, currentScopeVersionNumber)}
            </Pill>
          ) : null}
        </div>
      </td>
      <td>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
          {challenge.missing_items.map((item) => <ScopeDeltaBadge item={item} key={`m-${item}`} kind="missing" />)}
          {challenge.unstated_items.map((item) => <ScopeDeltaBadge item={item} key={`u-${item}`} kind="unstated" />)}
          {challenge.added_items.map((item) => <ScopeDeltaBadge item={item} key={`a-${item}`} kind="added" />)}
          {hasDeltas ? null : (
            <span>{isEarlierScope ? `Covers scope v${challenge.answered_scope_version_number} as requested` : 'Covers the requested scope'}</span>
          )}
        </div>
      </td>
      <td>
        <MoneyDisplay amountMinor={challenge.normalized_price_minor} currency={challenge.price_currency} /> / month
        <div style={{ color: '#475569', fontSize: '0.85rem' }}>
          {Math.round(challenge.scope_completeness * 100)}% of scope{isEarlierScope ? ` v${challenge.answered_scope_version_number}` : ''}
        </div>
      </td>
      <td><OfferSavings offer={challenge} /></td>
      <td><EvidenceChecks checks={challenge.evidence_checks} rollup={challenge.evidence_rollup} /></td>
    </tr>
  );
}
