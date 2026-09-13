/* Turns typed requirement rows into the API's requirement rows, or the first problem as a sentence. Shared by the task
   scope form and the split drawer, so a requirement typed in either place is validated the same way. Blank rows are
   skipped; blank hours stay unanswered, never zero (CLAUDE.md, AI boundaries). */
import type { RequirementDraft, TaskScopeDraftPayload } from './draftTypes';

export type RequirementRowPayload = TaskScopeDraftPayload['requirements'][number];

export type RequirementRowsResult = { rows: RequirementRowPayload[] } | { error: string };

/** Validate the typed rows and return the non-blank ones in API shape. Keys pass through so edited rows keep theirs. */
export function buildRequirementRows(drafts: RequirementDraft[]): RequirementRowsResult {
  const typed = drafts.filter((row) => row.text.trim() !== '');
  const badHours = typed.find((row) => row.hours.trim() !== '' && !/^\d+$/.test(row.hours.trim()));
  if (badHours) {
    return { error: `Hours for “${badHours.text.trim()}” must be a whole number, or blank if unanswered.` };
  }
  return {
    rows: typed.map((row) => {
      const hours = row.hours.trim() === '' ? null : Number(row.hours.trim());
      return {
        key: row.key,
        text: row.text.trim(),
        priority: row.priority,
        labor_category: row.laborCategory.trim() || null,
        psc: row.psc.trim().toUpperCase() || null,
        naics: row.naics.trim() || null,
        tags_status: row.isTagsConfirmed ? 'confirmed' : 'draft',
        hours_estimate: hours,
        hours_status: hours === null ? 'unanswered' : row.isHoursConfirmed ? 'confirmed' : 'draft',
        // A saved row keeps its origin; anything typed here is the owner's.
        source: row.source ?? 'owner',
      };
    }),
  };
}
