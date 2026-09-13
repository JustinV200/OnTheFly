/* The pass line under a card's figures: each configured threshold with ✓ met, ✗ not met, or a dash for not checked /
   not computed, and the card's own figure where it helps. Every outcome is also written out for screen readers, so the
   glyph and its colour are never the only signal. The thresholds printed are the ones stored on the card. */
import { Icon } from '../../../../shared/ui';
import type { SavingsCardView } from '../../types';
import { CheckOutcome, thresholdChecks } from './thresholdChecks';
import './figures.css';

const OUTCOME_WORDS: Record<CheckOutcome, string> = {
  met: 'met',
  not_met: 'not met',
  not_checked: 'not checked',
  not_computed: 'not computed',
};

/** Render the threshold checks as one wrapping line. */
export function ThresholdPassLine({ card }: { card: SavingsCardView }): JSX.Element {
  return (
    <ul aria-label="Thresholds for a suggestion" className="savings-pass-line">
      {thresholdChecks(card).map((check) => (
        <li className={`savings-pass-line__check savings-pass-line__check--${check.outcome}`} key={check.key}>
          <span>{check.label}</span>
          {check.outcome === 'met' ? <Icon name="check" size={14} /> : check.outcome === 'not_met' ? <Icon name="x" size={14} /> : <span aria-hidden="true">–</span>}
          <span className="ui-visually-hidden">{OUTCOME_WORDS[check.outcome]}</span>
          {check.detail ? <span className="savings-pass-line__detail">({check.detail})</span> : null}
          {check.outcome === 'not_checked' || check.outcome === 'not_computed' ? (
            <span aria-hidden="true" className="savings-pass-line__detail">{OUTCOME_WORDS[check.outcome]}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
