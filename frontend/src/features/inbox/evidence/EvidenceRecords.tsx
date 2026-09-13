/* The full evidence record for one offer, shown in its drawer: a rollup that names which sources it covers, then each
   check with its source, time, match confidence, and limitations. Every check the server lists is rendered, including
   checks that did not run; there is no blanket "verified" (CLAUDE.md, evidence and claims). */
import type { PillTone } from '../../../shared/components/Pill';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { Badge } from '../../../shared/ui';
import type { EvidenceCheckSummary, EvidenceRollup } from '../types';
import { evidenceLabel, evidenceSourceName } from './evidenceLabels';
import './EvidenceRecords.css';

// Only "needs review" asks the owner to act; the other rollups are plain coverage statements, never a success state.
const ROLLUP_TONES: Record<EvidenceRollup['label'], PillTone> = {
  'needs review': 'warning',
  'information missing': 'neutral',
  'checks complete for selected sources': 'neutral',
};

interface EvidenceRecordsProps {
  rollup: EvidenceRollup;
  checks: EvidenceCheckSummary[];
  lastUpdated: string;
}

/** Render the rollup and one record per named check. */
export function EvidenceRecords({ rollup, checks, lastUpdated }: EvidenceRecordsProps): JSX.Element {
  const namesOf = (sources: string[]): string => sources.map(evidenceSourceName).join(', ') || 'none';
  return (
    <div className="evidence-records">
      <div className="evidence-records__rollup">
        <Badge tone={ROLLUP_TONES[rollup.label] ?? 'warning'}>{rollup.label}</Badge>
        <span className="ui-text-sm ui-text-muted">
          Ran: {namesOf(rollup.sources_checked)} · Not run: {namesOf(rollup.sources_not_run)}
        </span>
      </div>
      <ul className="evidence-records__list">
        {checks.map((check) => {
          const label = evidenceLabel(check.source, check.status);
          return (
            <li className="evidence-records__item" key={check.source}>
              <div className="evidence-records__head">
                <span className="evidence-records__name">{label.source}</span>
                <Badge tone={label.tone}>{label.statusLong}</Badge>
              </div>
              <p className="evidence-records__limits">{check.limitations}</p>
              <p className="evidence-records__meta">
                {formatTimestamp(check.checked_at)}
                {check.match_confidence ? ` · match confidence: ${check.match_confidence}` : ''}
                {' · '}source: {check.source}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="evidence-records__meta">Evidence last updated {formatTimestamp(lastUpdated)}</p>
    </div>
  );
}
