/* Describes an owner's supplies, equipment, and taxes expectations for a listing in words.
   "Not stated" stays distinct from "not included", the same three answers TriStateSelect offers. */
interface ScopeExpectations {
  supplies_included: boolean | null;
  equipment_included: boolean | null;
  taxes_included: boolean | null;
}

/** Return a phrase like "supplies not included · equipment included · taxes not stated". */
export function describeScopeExpectations(expectations: ScopeExpectations): string {
  const answers: Array<[string, boolean | null]> = [
    ['supplies', expectations.supplies_included],
    ['equipment', expectations.equipment_included],
    ['taxes', expectations.taxes_included],
  ];
  return answers.map(([label, value]) => `${label} ${describeAnswer(value)}`).join(' · ');
}

function describeAnswer(value: boolean | null): string {
  if (value === null) {
    return 'not stated';
  }
  return value ? 'included' : 'not included';
}
