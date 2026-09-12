/* Renders one owner-visible challenge row with scope gaps and potential savings.
   Scope deltas are shown before price to avoid misleading comparisons. */
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { ProvenanceBadge } from '../../shared/components/ProvenanceBadge';
import { ScopeDeltaBadge } from './ScopeDeltaBadge';
import type { InboxChallenge } from './types';

interface ChallengeRowProps {
  challenge: InboxChallenge;
}

/** Render one challenge row in the owner inbox table. */
export function ChallengeRow({ challenge }: ChallengeRowProps): JSX.Element {
  return (
    <tr>
      <td>{challenge.challenger_name}</td>
      <td>
        {challenge.missing_items.map((item) => <ScopeDeltaBadge key={`m-${item}`} label={`Missing: ${item}`} />)}
        {challenge.unstated_items.map((item) => <ScopeDeltaBadge key={`u-${item}`} label={`Unstated: ${item}`} />)}
        {challenge.added_items.map((item) => <ScopeDeltaBadge key={`a-${item}`} label={`Added: ${item}`} />)}
      </td>
      <td><MoneyDisplay amountMinor={challenge.normalized_price_minor} currency={challenge.price_currency} /></td>
      <td>{Math.round(challenge.scope_completeness * 100)}%</td>
      <td>
        {challenge.savings.label}:{' '}
        <MoneyDisplay amountMinor={challenge.savings.first_year_net_savings_minor} currency={challenge.price_currency} />
      </td>
      <td>
        {/* The rollup always names what it covers; a bare label would read as a verification badge. */}
        <div>
          <strong>{challenge.evidence_rollup.label}</strong>
          {' '}(checked: {challenge.evidence_rollup.sources_checked.join(', ') || 'none'}
          ; not run: {challenge.evidence_rollup.sources_not_run.join(', ') || 'none'})
        </div>
        <div>Platform: {challenge.platform_check_status}</div>
        <div>Identity: {challenge.identity_check_status}</div>
        <div>Registry: {challenge.registry_check_status}</div>
      </td>
      <td><ProvenanceBadge label={challenge.provenance} /></td>
    </tr>
  );
}
