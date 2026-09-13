/* Names what a typed requirement row still lacks before Ways to save can price it: a labor category, PSC and NAICS tags to
   group it by, and hours to cost it. Words only; it never fills anything in (plan2, "Model and code boundaries"). */
import type { RequirementDraft } from '../../draft/draftTypes';

/** Return the missing pricing inputs in reading order, e.g. ["PSC", "hours"]; empty when the row has them all. */
export function rowGaps(row: RequirementDraft): string[] {
  const gaps: string[] = [];
  if (row.laborCategory.trim() === '') {
    gaps.push('labor category');
  }
  if (row.psc.trim() === '') {
    gaps.push('PSC');
  }
  if (row.naics.trim() === '') {
    gaps.push('NAICS');
  }
  if (row.hours.trim() === '') {
    gaps.push('hours');
  }
  return gaps;
}

/** Return true when the owner has confirmed the row's tags, and its hours too if it has any. */
export function isRowConfirmed(row: RequirementDraft): boolean {
  return row.isTagsConfirmed && (row.hours.trim() === '' || row.isHoursConfirmed);
}
