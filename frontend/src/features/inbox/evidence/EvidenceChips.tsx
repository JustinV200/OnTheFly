/* One small chip per evidence check for an offer row: "Platform data: matched", "Identity: not checked",
   "Registry: not connected". Every check the server lists gets a chip, including ones that did not run, so the checks
   that did run never look comprehensive. Timestamps and limitations live in the offer drawer. */
import { Badge } from '../../../shared/ui';
import type { EvidenceCheckSummary } from '../types';
import { evidenceLabel } from './evidenceLabels';
import './EvidenceChips.css';

/** Render the evidence chips, in the server's fixed order (platform, identity, registry). */
export function EvidenceChips({ checks }: { checks: EvidenceCheckSummary[] }): JSX.Element {
  if (checks.length === 0) {
    // The server always lists three; an empty list is a fault worth seeing, not a clean record.
    return <Badge tone="danger">No evidence checks listed</Badge>;
  }
  return (
    <ul aria-label="Evidence checks" className="evidence-chips">
      {checks.map((check) => {
        const label = evidenceLabel(check.source, check.status);
        return (
          <li key={check.source}>
            <Badge tone={label.tone}>
              <span className="evidence-chips__source">{label.source}:</span> {label.status}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
