/* Plain names for evidence sources and statuses, shared by the row's coverage chip and the full records in the drawer.
   "Not checked" and "no match found in this source" never read as verified (CLAUDE.md, evidence and claims), and an
   unknown status or source is shown as itself, never hidden. Implementation names ("registry stub") stay visible in the
   drawer's full record; the plain names are used everywhere else (roadmap 11, "Copy and density pass"). */
import type { PillTone } from '../../../shared/components/Pill';

export interface EvidenceLabel {
  // Short plain-language source name, e.g. "Identity".
  source: string;
  // Short status words for a chip, e.g. "not checked".
  status: string;
  // The status as a full phrase for the drawer.
  statusLong: string;
  tone: PillTone;
}

const SOURCE_NAMES: Record<string, string> = {
  'platform data': 'Platform data',
  'identity match': 'Identity',
  'registry stub': 'Registry',
};

const STATUSES: Record<string, Omit<EvidenceLabel, 'source'>> = {
  matched: { status: 'matched', statusLong: 'matched', tone: 'success' },
  no_match_found: { status: 'no match found', statusLong: 'no match found in this source', tone: 'neutral' },
  uncertain: { status: 'needs review', statusLong: 'possible match: needs review', tone: 'warning' },
  not_checked: { status: 'not checked', statusLong: 'not checked', tone: 'neutral' },
  unavailable: { status: 'unavailable', statusLong: 'source unavailable: not checked', tone: 'warning' },
};

// The registry is a stub that always reports not_checked; "not connected" says why, which "not checked" alone doesn't.
const REGISTRY_STUB_NOT_CHECKED: Omit<EvidenceLabel, 'source'> = {
  status: 'not connected',
  statusLong: 'not connected yet: no registry lookup exists',
  tone: 'neutral',
};

// The statuses that mean a lookup actually ran. Everything else — not checked, unavailable, an unrecognized status —
// counts as not checked, so a source that failed or was never connected can never be summarized as covered
// (CLAUDE.md, "Evidence and claims").
const RAN_STATUSES = new Set(['matched', 'no_match_found', 'uncertain']);

/** Return the plain name for a source, or the server's own name when there is no plainer one. */
export function evidenceSourceName(source: string): string {
  return SOURCE_NAMES[source] ?? source;
}

/** True when this status means the source was actually queried. Unknown statuses are false, never assumed checked. */
export function hasCheckRun(status: string): boolean {
  return RAN_STATUSES.has(status);
}

/** Return the plain labels for one check's source and status. */
export function evidenceLabel(source: string, status: string): EvidenceLabel {
  const sourceName = evidenceSourceName(source);
  if (source === 'registry stub' && status === 'not_checked') {
    return { source: sourceName, ...REGISTRY_STUB_NOT_CHECKED };
  }
  const known = STATUSES[status];
  if (known) {
    return { source: sourceName, ...known };
  }
  return { source: sourceName, status: `unrecognized: ${status}`, statusLong: `unrecognized status: ${status}`, tone: 'danger' };
}
