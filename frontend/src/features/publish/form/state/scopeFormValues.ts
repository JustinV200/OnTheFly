/* The scope form's editable values, kept as the owner typed them (strings for text inputs, an answer for included costs).
   Parsing into the API's shape happens once, at submit, in buildDraftPayload. */

// "not_stated" is a deliberate answer ("I'm not saying"); null is a question the owner hasn't answered yet.
// Both publish as null, but only null counts as an unanswered question before Preview.
export type IncludedAnswer = 'included' | 'not_included' | 'not_stated';

export interface ScopeFormValues {
  serviceArea: string;
  locationApproximate: string;
  squareFootage: string;
  visitFrequency: string;
  bathroomCount: string;
  requiredTasks: string;
  suppliesIncluded: IncludedAnswer | null;
  equipmentIncluded: IncludedAnswer | null;
  taxesIncluded: IncludedAnswer | null;
  currentPrice: string;
  billingCadence: string;
  deadlineDate: string;
  incumbentVendorName: string;
}

// Field groups receive a partial update so each input only names the value it owns.
export type ScopeFormChange = (patch: Partial<ScopeFormValues>) => void;

// Everything starts unanswered (roadmap 11, "Remove silent defaults"): nothing is guessed from the vendor or category.
// Price and cadence are filled from the selected expense's transaction baseline, which the owner confirms or corrects.
export const EMPTY_SCOPE_FORM_VALUES: ScopeFormValues = {
  serviceArea: '',
  locationApproximate: '',
  squareFootage: '',
  visitFrequency: '',
  bathroomCount: '',
  requiredTasks: '',
  suppliesIncluded: null,
  equipmentIncluded: null,
  taxesIncluded: null,
  currentPrice: '',
  billingCadence: '',
  deadlineDate: '',
  incumbentVendorName: '',
};
