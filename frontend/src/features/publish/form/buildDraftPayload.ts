/* Turns the scope form's values into the POST /api/listings draft payload.
   Blank text becomes null ("not stated"), never zero or an empty string, and the vendor name is only shown when one exists. */
import type { PublishChoices } from '../types';
import type { ScopeFormValues } from './scopeFormValues';

interface DraftPayloadInput {
  expenseId: string;
  currency: string;
  // Already parsed and validated by the form; a null price never reaches this function.
  priceMinor: number;
  values: ScopeFormValues;
  choices: PublishChoices;
}

/** Return the draft request body for the given form values. */
export function buildDraftPayload({ expenseId, currency, priceMinor, values, choices }: DraftPayloadInput): Record<string, unknown> {
  const tasks = values.requiredTasks.split(',').map((task) => task.trim()).filter(Boolean);

  return {
    expense_id: expenseId,
    scope: {
      service_area: values.serviceArea || null,
      location_approximate: values.locationApproximate || null,
      square_footage: toOptionalInteger(values.squareFootage),
      visit_frequency: values.visitFrequency || null,
      bathroom_count: toOptionalInteger(values.bathroomCount),
      required_tasks: tasks.length > 0 ? tasks : null,
      supplies_included: values.suppliesIncluded,
      equipment_included: values.equipmentIncluded,
      taxes_included: values.taxesIncluded,
      current_price_minor: priceMinor,
      current_price_currency: currency,
      billing_cadence: values.billingCadence,
      // End of the chosen day in the owner's timezone; the server stores it as UTC.
      challenge_deadline: values.deadlineDate ? new Date(`${values.deadlineDate}T23:59:59`).toISOString() : null,
      incumbent_vendor_name: values.incumbentVendorName || null,
    },
    choices: { ...choices, show_incumbent_vendor: choices.show_incumbent_vendor && values.incumbentVendorName.trim() !== '' },
  };
}

function toOptionalInteger(text: string): number | null {
  // Blank means "not specified", which the scope keeps distinct from zero.
  const trimmed = text.trim().replace(/,/g, '');
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}
