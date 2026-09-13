/* Rewords one savings assumption from the server into plain language for the owner, without changing what it says.
   The server writes scope gaps with internal keys ("offer does not cover requested scope: equipment_included"); roadmap 11
   ("Offers inbox") calls that a leak. Only the wording changes here: no assumption is dropped, merged, or re-derived.
   Also used by the trace page, which shows the same assumptions under the same figure. */
import { scopeItemLabel } from '../../../shared/format/scopeItemLabel';

// Prefixes the backend's compute_savings writes before a comma-separated list of scope keys (comparison/savings.py).
const SCOPE_LIST_PREFIXES: Array<{ prefix: string; lead: string }> = [
  { prefix: 'offer does not cover requested scope: ', lead: 'Doesn’t cover part of your scope' },
  { prefix: 'offer does not state: ', lead: 'Doesn’t say whether it covers' },
];

// Unknown costs the server treats as zero and flags; the wording says that nothing was subtracted for them.
const KNOWN_SENTENCES: Record<string, string> = {
  'setup fee not provided': 'No setup fee stated, so none is subtracted',
  'switching cost not provided': 'Your switching cost is unknown, so none is subtracted',
  'cancellation fee not provided': 'Any cancellation fee is unknown, so none is subtracted',
};

/** Return the owner-facing wording for one server assumption; anything unrecognised is returned exactly as sent. */
export function describeAssumption(assumption: string): string {
  const known = KNOWN_SENTENCES[assumption];
  if (known) {
    return known;
  }
  for (const { prefix, lead } of SCOPE_LIST_PREFIXES) {
    if (assumption.startsWith(prefix)) {
      // The list is joined with ", " by the server; each key is labelled on its own so none keeps an underscore.
      const items = assumption.slice(prefix.length).split(', ').map(scopeItemLabel);
      return `${lead}: ${items.join(', ')}`;
    }
  }
  // A new server assumption must still show, even before it has friendlier words.
  return assumption;
}
