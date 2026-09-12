/* Turns a public listing's structured scope requirements into challenge form fields.
   It reads only the listing's structured public fields and never guesses from the prose scope_summary. */
import type { PublicListingProjection } from '../publish/types';
import type { ChallengeFormFields } from './buildChallengePayload';

// "3x weekly", "3 × weekly", "3 times per week", "3x/week", "3 times a week". The count is sent back as
// "3x weekly", the form backend comparison/normalize.py reads, so only the number needs to be found here.
const VISITS_PER_WEEK_RE = /(\d+)\s*(?:x|×|times)\s*(?:\/\s*|a\s+|per\s+)?week(?:ly)?/i;

export type RequestedScopeFields = Pick<
  ChallengeFormFields,
  'tasks' | 'visitsPerWeek' | 'equipmentIncluded' | 'suppliesIncluded' | 'taxesIncluded'
>;

/** Return the scope fields that offer exactly what the listing requests.
    Anything the owner did not state stays unstated (blank visits, null expectations); nothing is forced to "included". */
export function fullRequestedScope(listing: PublicListingProjection): RequestedScopeFields {
  return {
    // Duplicates would render twice as checkboxes; the backend scores each named task once either way.
    tasks: Array.from(new Set(listing.required_tasks)),
    visitsPerWeek: VISITS_PER_WEEK_RE.exec(listing.visit_frequency ?? '')?.[1] ?? '',
    equipmentIncluded: listing.equipment_included,
    suppliesIncluded: listing.supplies_included,
    taxesIncluded: listing.taxes_included,
  };
}
