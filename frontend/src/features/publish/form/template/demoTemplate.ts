/* The rehearsal shortcut behind "Fill with demo template": answers every still-unanswered scope question with the
   category's example values (plan1.md §4 demo scope). It is an explicit owner action, never a default, and it never
   touches what the owner already typed, the transaction baseline (price, cadence), or any disclosure choice. */
import type { ScopeFormValues } from '../state/scopeFormValues';
import type { CategoryFieldSet } from './categoryFieldSet';

/** Return values with each blank or unanswered scope field filled from the field set's examples. */
export function applyDemoTemplate(values: ScopeFormValues, fieldSet: CategoryFieldSet): ScopeFormValues {
  const { examples } = fieldSet;
  const fillText = (current: string, example: string): string => (current.trim() === '' ? example : current);

  return {
    ...values,
    serviceArea: fillText(values.serviceArea, examples.serviceArea),
    locationApproximate: fillText(values.locationApproximate, examples.locationApproximate),
    squareFootage: fillText(values.squareFootage, examples.squareFootage),
    visitFrequency: fillText(values.visitFrequency, examples.visitFrequency),
    // A hidden field stays blank, so the template can't publish a bathroom count for pest control.
    bathroomCount: fieldSet.hasBathrooms ? fillText(values.bathroomCount, examples.bathroomCount) : values.bathroomCount,
    requiredTasks: fillText(values.requiredTasks, examples.requiredTasks),
    // The demo business supplies its own consumables and equipment; taxes are deliberately left "Not stated".
    suppliesIncluded: values.suppliesIncluded ?? 'included',
    equipmentIncluded: values.equipmentIncluded ?? 'included',
    taxesIncluded: values.taxesIncluded ?? 'not_stated',
  };
}
