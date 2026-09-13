/* The scope form's editable values, kept as the owner typed them (strings for text inputs, tri-state for terms).
   Parsing into the API's shape happens once, at submit, in buildDraftPayload. */

export interface ScopeFormValues {
  serviceArea: string;
  locationApproximate: string;
  squareFootage: string;
  visitFrequency: string;
  bathroomCount: string;
  requiredTasks: string;
  // null is "not stated", which the scope keeps distinct from "not included".
  suppliesIncluded: boolean | null;
  equipmentIncluded: boolean | null;
  taxesIncluded: boolean | null;
  currentPrice: string;
  billingCadence: string;
  deadlineDate: string;
  incumbentVendorName: string;
}

// Field groups receive a partial update so each input only names the value it owns.
export type ScopeFormChange = (patch: Partial<ScopeFormValues>) => void;

// Demo-template defaults (plan1.md §4). The owner confirms or edits every one before previewing.
// Price and cadence start blank and are prefilled from the selected expense's transaction baseline.
export const INITIAL_SCOPE_FORM_VALUES: ScopeFormValues = {
  serviceArea: 'San Francisco Bay Area',
  locationApproximate: 'San Francisco, CA',
  squareFootage: '8000',
  visitFrequency: '3x weekly',
  bathroomCount: '4',
  requiredTasks: 'vacuum, trash, restrooms',
  suppliesIncluded: null,
  equipmentIncluded: null,
  taxesIncluded: null,
  currentPrice: '',
  billingCadence: '',
  deadlineDate: '',
  incumbentVendorName: '',
};
