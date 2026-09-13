/* The one vocabulary for a requirement's priority, so the listing's Scope tab, the bid form, the submitted offer and the
   trace all say the same words. Priorities are "must" | "should" (backend models/scope/requirement.py). */

/** Return "Nice to have" for a "should" requirement and "Required" for anything else, the stricter reading. */
export function requirementPriorityLabel(priority: string): string {
  return priority === 'should' ? 'Nice to have' : 'Required';
}
