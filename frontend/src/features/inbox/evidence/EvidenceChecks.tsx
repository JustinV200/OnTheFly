/* Lists each evidence check with its source, time, status, and limits, under a rollup that names its coverage.
   "Not checked" and "no match found in this source" are never shown as verified (CLAUDE.md, evidence and claims).
   Every check the server lists is rendered, including checks that did not run; none is folded away. */
import { Pill, PillTone } from '../../../shared/components/Pill';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import type { EvidenceCheckSummary, EvidenceRollup } from '../types';
import './EvidenceChecks.css';

const STATUS_LABELS: Record<string, { text: string; tone: PillTone }> = {
  matched: { text: 'matched', tone: 'success' },
  no_match_found: { text: 'no match found in this source', tone: 'neutral' },
  uncertain: { text: 'possible match: needs review', tone: 'warning' },
  not_checked: { text: 'not checked', tone: 'neutral' },
  unavailable: { text: 'source unavailable: not checked', tone: 'warning' },
};

// Only "needs review" asks the owner to act; the other rollups are plain coverage statements, never a success state.
const ROLLUP_TONES: Record<EvidenceRollup['label'], PillTone> = {
  'needs review': 'warning',
  'information missing': 'neutral',
  'checks complete for selected sources': 'neutral',
};

interface EvidenceChecksProps {
  rollup: EvidenceRollup;
  checks: EvidenceCheckSummary[];
}

/** Render the rollup label and one entry per named check, including checks that did not run. */
export function EvidenceChecks({ rollup, checks }: EvidenceChecksProps): JSX.Element {
  return (
    <div className="evidence-checks">
      <div className="evidence-checks__summary">
        <span className="ui-eyebrow">Evidence</span>
        <Pill tone={ROLLUP_TONES[rollup.label] ?? 'warning'}>{rollup.label}</Pill>
        <span className="ui-text-sm ui-text-muted">
          ran: {rollup.sources_checked.join(', ') || 'none'} · not run: {rollup.sources_not_run.join(', ') || 'none'}
        </span>
      </div>
      <ul className="evidence-checks__list">
        {checks.map((check) => {
          const label = STATUS_LABELS[check.status] ?? { text: `unrecognized status: ${check.status}`, tone: 'danger' as const };
          return (
            <li className="evidence-checks__item" key={check.source}>
              <div className="evidence-checks__source">
                <span className="evidence-checks__source-name">{check.source}</span>
                <Pill tone={label.tone}>{label.text}</Pill>
              </div>
              <div className="ui-text-xs ui-text-muted">{formatTimestamp(check.checked_at)} · {check.limitations}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
