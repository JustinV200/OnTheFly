/* Turns the scope form's values into the POST /api/listings draft payload.
   Blank text becomes null ("not stated"), never zero or an empty string, and the vendor name is only shown when one exists. */
import type { PublishChoices } from '../../types';
import type { CategoryFieldSet } from '../template/categoryFieldSet';
import type { IncludedAnswer, ScopeFormValues } from './scopeFormValues';

interface DraftPayloadInput {
  expenseId: string;
  currency: string;
  // Already parsed and validated by the form; a null price never reaches this function.
  priceMinor: number;
  values: ScopeFormValues;
  choices: PublishChoices;
  // Fields the category doesn't ask about are sent as not stated, even if a value was typed before switching expense.
  fieldSet: CategoryFieldSet;
}

/** Return the draft request body for the given form values. */
export function buildDraftPayload({ expenseId, currency, priceMinor, values, choices, fieldSet }: DraftPayloadInput): Record<string, unknown> {
  const tasks = values.requiredTasks.split(',').map((task) => task.trim()).filter(Boolean);

  return {
    expense_id: expenseId,
    scope: {
      service_area: values.serviceArea.trim() || null,
      location_approximate: values.locationApproximate.trim() || null,
      square_footage: toOptionalInteger(values.squareFootage),
      visit_frequency: values.visitFrequency.trim() || null,
      bathroom_count: fieldSet.hasBathrooms ? toOptionalInteger(values.bathroomCount) : null,
      required_tasks: tasks.length > 0 ? tasks : null,
      supplies_included: toIncludedFlag(values.suppliesIncluded),
      equipment_included: toIncludedFlag(values.equipmentIncluded),
      taxes_included: toIncludedFlag(values.taxesIncluded),
      current_price_minor: priceMinor,
      current_price_currency: currency,
      billing_cadence: values.billingCadence,
      // End of the chosen day in the owner's timezone; the server stores it as UTC.
      challenge_deadline: values.deadlineDate ? new Date(`${values.deadlineDate}T23:59:59`).toISOString() : null,
      incumbent_vendor_name: values.incumbentVendorName.trim() || null,
    },
    choices: { ...choices, show_incumbent_vendor: choices.show_incumbent_vendor && values.incumbentVendorName.trim() !== '' },
  };
}

function toOptionalInteger(text: string): number | null {
  // Blank means "not specified", which the scope keeps distinct from zero.
  const trimmed = text.trim().replace(/,/g, '');
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

function toIncludedFlag(answer: IncludedAnswer | null): boolean | null {
  // Unanswered and "Not stated" both publish as null: the API has one "not stated" value, and neither is a yes or a no.
  if (answer === 'included') {
    return true;
  }
  return answer === 'not_included' ? false : null;
}
