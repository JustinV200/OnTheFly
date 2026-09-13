/* One neutral coverage chip per offer row: "1 of 3 sources checked". It is a count, never a verdict — a row of
   per-source chips repeated the same "not checked" on every offer and crowded out the figures beside it. The full
   per-source record (status, time, confidence, limitations) stays in the offer drawer's EvidenceRecords, which is the
   only place a source's own result is shown (CLAUDE.md, "Evidence and claims"). */
import { Badge } from '../../../shared/ui';
import type { EvidenceCheckSummary } from '../types';
import { evidenceSourceName, hasCheckRun } from './evidenceLabels';
import './EvidenceChips.css';

/** Render how many of the listed evidence sources were actually queried for this offer. */
export function EvidenceChips({ checks }: { checks: EvidenceCheckSummary[] }): JSX.Element {
  if (checks.length === 0) {
    // The server always lists three; an empty list is a fault worth seeing, not a clean record.
    return <Badge tone="danger">No evidence checks listed</Badge>;
  }

  const ran = checks.filter((check) => hasCheckRun(check.status));
  const notRun = checks.filter((check) => !hasCheckRun(check.status));
  // Neutral whatever the count: a full count means the sources ran, not that anything was verified.
  return (
    <span className="evidence-chips" title={`Ran: ${namesOf(ran)} · Not run: ${namesOf(notRun)}. Open the offer for each result.`}>
      <Badge tone="neutral">{ran.length} of {checks.length} sources checked</Badge>
    </span>
  );
}

function namesOf(checks: EvidenceCheckSummary[]): string {
  return checks.map((check) => evidenceSourceName(check.source)).join(', ') || 'none';
}
