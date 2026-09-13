/* Turns AI-drafted rows into editable form rows. Every one stays a draft: tags and hours unconfirmed and the row marked
   llm-draft, so nothing the model wrote counts as confirmed until the owner ticks it (plan2, "Model and code boundaries"). */
import { newRowId, RequirementDraft } from '../draft/draftTypes';
import type { RequirementDraftResult } from './requestRequirementDraft';

/** Return form rows for the draft's requirements. */
export function draftRowsFromResult(result: RequirementDraftResult): RequirementDraft[] {
  return result.requirements.map((row) => ({
    rowId: newRowId(),
    key: null,
    text: row.text,
    priority: row.priority,
    laborCategory: row.labor_category ?? '',
    psc: row.psc ?? '',
    naics: row.naics ?? '',
    isTagsConfirmed: false,
    hours: row.hours_estimate === null ? '' : String(row.hours_estimate),
    isHoursConfirmed: false,
    source: 'llm-draft',
  }));
}

/** Return the rows with the drafted ones appended, dropping blank rows the owner never typed into. */
export function withDraftedRows(rows: RequirementDraft[], drafted: RequirementDraft[]): RequirementDraft[] {
  return [...rows.filter((row) => row.text.trim() !== ''), ...drafted];
}
