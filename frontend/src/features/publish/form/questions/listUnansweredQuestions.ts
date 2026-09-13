/* Lists the scope questions the owner hasn't answered, in form order, for the "N questions unanswered" note before Preview.
   Gaps before price: an unanswered question publishes as "not specified", and challengers price against that.
   Bidding choices (deadline, vendor name) are decisions with a safe default, not scope questions, so they aren't listed. */
import type { ScopeFormValues } from '../state/scopeFormValues';
import type { CategoryFieldSet } from '../template/categoryFieldSet';
import { SCOPE_FIELD_IDS } from './scopeFieldIds';

export interface UnansweredQuestion {
  // The id of the control to move focus to, so each listed gap is one click from its field.
  fieldId: string;
  label: string;
}

/** Return every unanswered scope question. Blank text and an unchosen included-cost answer count; "Not stated" doesn't. */
export function listUnansweredQuestions(values: ScopeFormValues, fieldSet: CategoryFieldSet): UnansweredQuestion[] {
  const isBlank = (text: string): boolean => text.trim() === '';
  const questions: Array<[boolean, UnansweredQuestion]> = [
    // The public area falls back from one to the other (backend projection.py), so either one answers "where".
    [isBlank(values.serviceArea) && isBlank(values.locationApproximate), { fieldId: SCOPE_FIELD_IDS.where, label: 'Where the work happens' }],
    [isBlank(values.visitFrequency), { fieldId: SCOPE_FIELD_IDS.visitFrequency, label: 'How often' }],
    [isBlank(values.requiredTasks), { fieldId: SCOPE_FIELD_IDS.requiredTasks, label: 'Required tasks' }],
    [isBlank(values.squareFootage), { fieldId: SCOPE_FIELD_IDS.squareFootage, label: 'Square footage' }],
    [fieldSet.hasBathrooms && isBlank(values.bathroomCount), { fieldId: SCOPE_FIELD_IDS.bathroomCount, label: 'Bathrooms' }],
    [values.suppliesIncluded === null, { fieldId: SCOPE_FIELD_IDS.suppliesIncluded, label: 'Are supplies included?' }],
    [values.equipmentIncluded === null, { fieldId: SCOPE_FIELD_IDS.equipmentIncluded, label: 'Is equipment included?' }],
    [values.taxesIncluded === null, { fieldId: SCOPE_FIELD_IDS.taxesIncluded, label: 'Are taxes included?' }],
  ];
  return questions.filter(([isUnanswered]) => isUnanswered).map(([, question]) => question);
}
