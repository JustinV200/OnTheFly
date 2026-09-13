/* Which optional scope fields a category asks about, and the example answers shown as placeholders.
   Pest control shouldn't be asked for bathrooms (roadmap 11, "Fields by category"). The same examples fill the demo
   template, so "Fill with demo template" types exactly what the placeholders already showed. The DevSecOps field set
   (labor mix, hours, clearance) arrives with the P0 scope work; until then unknown categories get neutral examples. */

export interface ScopeExamples {
  serviceArea: string;
  locationApproximate: string;
  squareFootage: string;
  visitFrequency: string;
  bathroomCount: string;
  requiredTasks: string;
}

export interface CategoryFieldSet {
  // Bathrooms only mean something for cleaning; elsewhere the field is hidden and publishes as not stated.
  hasBathrooms: boolean;
  examples: ScopeExamples;
}

const BAY_AREA = { serviceArea: 'San Francisco Bay Area', locationApproximate: 'San Francisco, CA' };

const CLEANING: CategoryFieldSet = {
  hasBathrooms: true,
  examples: { ...BAY_AREA, squareFootage: '8,000', visitFrequency: '3x weekly', bathroomCount: '4', requiredTasks: 'vacuum, trash, restrooms' },
};

const FIELD_SETS: Record<string, CategoryFieldSet> = {
  cleaning: CLEANING,
  // Older listings used this key for the same category (shared/format/categoryLabel.ts).
  commercial_cleaning: CLEANING,
  landscaping: {
    hasBathrooms: false,
    examples: { ...BAY_AREA, squareFootage: '12,000', visitFrequency: '1x weekly', bathroomCount: '', requiredTasks: 'mowing, edging, leaf removal' },
  },
  pest_control: {
    hasBathrooms: false,
    examples: { ...BAY_AREA, squareFootage: '8,000', visitFrequency: '1x monthly', bathroomCount: '', requiredTasks: 'interior treatment, rodent monitoring' },
  },
};

const GENERIC: CategoryFieldSet = {
  hasBathrooms: false,
  examples: { ...BAY_AREA, squareFootage: '5,000', visitFrequency: '1x weekly', bathroomCount: '', requiredTasks: 'delivery, restocking' },
};

/** Return the field set for an expense category; unknown or missing categories get the generic set. */
export function categoryFieldSet(category: string | null): CategoryFieldSet {
  return (category ? FIELD_SETS[category] : undefined) ?? GENERIC;
}
