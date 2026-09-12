/* Lists each evidence check with its source, time, status, and limits, under a rollup that names its coverage.
   "Not checked" and "no match found in this source" are never shown as verified (CLAUDE.md, evidence and claims). */
import { Pill, PillTone } from '../../../shared/components/Pill';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import type { EvidenceCheckSummary, EvidenceRollup } from '../types';

const STATUS_LABELS: Record<string, { text: string; tone: PillTone }> = {
  matched: { text: 'matched', tone: 'success' },
  no_match_found: { text: 'no match found in this source', tone: 'neutral' },
  uncertain: { text: 'possible match: needs review', tone: 'warning' },
  not_checked: { text: 'not checked', tone: 'neutral' },
  unavailable: { text: 'source unavailable: not checked', tone: 'warning' },
};

interface EvidenceChecksProps {
  rollup: EvidenceRollup;
  checks: EvidenceCheckSummary[];
}

/** Render the rollup label and one line per named check, including checks that did not run. */
export function EvidenceChecks({ rollup, checks }: EvidenceChecksProps): JSX.Element {
  return (
    <div style={{ fontSize: '0.85rem' }}>
      <div style={{ fontWeight: 700 }}>{rollup.label}</div>
      <div style={{ color: '#475569' }}>
        ran: {rollup.sources_checked.join(', ') || 'none'} · not run: {rollup.sources_not_run.join(', ') || 'none'}
      </div>
      <ul style={{ listStyle: 'none', margin: '0.25rem 0 0', padding: 0 }}>
        {checks.map((check) => {
          const label = STATUS_LABELS[check.status] ?? { text: `unrecognized status: ${check.status}`, tone: 'danger' as const };
          return (
            <li key={check.source} style={{ marginBottom: '0.25rem' }} title={check.limitations}>
              {check.source}: <Pill tone={label.tone}>{label.text}</Pill>
              <div style={{ color: '#64748b' }}>{formatTimestamp(check.checked_at)} · {check.limitations}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
