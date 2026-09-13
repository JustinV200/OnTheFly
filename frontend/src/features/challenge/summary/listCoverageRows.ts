/* Builds the "Requested vs your offer" rows for the summary card by echoing the form's answers beside the listing's
   requests. It judges nothing: no match check, no score, no completeness percentage (roadmap 11, "No client-side math").
   The server scores the offer, and the owner's inbox shows that score. */
import type { PublicListingProjection } from '../../publish/types';
import type { ChallengeFormFields } from '../buildChallengePayload';

// covered / not_covered / not_stated echo an explicit answer; "stated" is a typed value shown as typed (visits).
export type CoverageAnswer = 'covered' | 'not_covered' | 'not_stated' | 'stated';

export interface CoverageRow {
  key: string;
  label: string;
  // The owner's request in words, e.g. "Required" or "Included".
  requested: string;
  answer: CoverageAnswer;
  // The challenger's answer in words, e.g. "Covered", "Not stated", "3x weekly".
  answerText: string;
}

/** Return one row per requested task, the visit frequency, and each included-cost term, in form order. */
export function listCoverageRows(listing: PublicListingProjection, fields: ChallengeFormFields): CoverageRow[] {
  const rows: CoverageRow[] = Array.from(new Set(listing.required_tasks)).map((task) => {
    const isTicked = fields.tasks.includes(task);
    return { key: `task:${task}`, label: task, requested: 'Required', answer: isTicked ? 'covered' : 'not_covered', answerText: isTicked ? 'Covered' : 'Not covered' };
  });

  const visits = fields.visitsPerWeek.trim();
  rows.push({
    key: 'visits',
    label: 'Visits',
    requested: listing.visit_frequency ?? 'Not stated',
    // The count is echoed in the words the payload will send ("3x weekly"); whether it matches is the server's call.
    answer: visits ? 'stated' : 'not_stated',
    answerText: visits ? `${visits}x weekly` : 'Not stated',
  });

  const terms: Array<[string, boolean | null, boolean | null]> = [
    ['Equipment', listing.equipment_included, fields.equipmentIncluded],
    ['Supplies', listing.supplies_included, fields.suppliesIncluded],
    ['Taxes', listing.taxes_included, fields.taxesIncluded],
  ];
  for (const [label, requested, answer] of terms) {
    rows.push({
      key: label,
      label,
      requested: includedWords(requested),
      answer: answer === null ? 'not_stated' : answer ? 'covered' : 'not_covered',
      answerText: includedWords(answer),
    });
  }
  return rows;
}

function includedWords(value: boolean | null): string {
  if (value === null) {
    return 'Not stated';
  }
  return value ? 'Included' : 'Not included';
}
