/* Stable DOM ids for the scope controls the unanswered-questions list moves focus to.
   The field components and listUnansweredQuestions both read these, so a link can never point at a renamed field. */
export const SCOPE_FIELD_IDS = {
  where: 'publish-scope-service-area',
  visitFrequency: 'publish-scope-visit-frequency',
  requiredTasks: 'publish-scope-required-tasks',
  squareFootage: 'publish-scope-square-footage',
  bathroomCount: 'publish-scope-bathrooms',
  suppliesIncluded: 'publish-scope-supplies',
  equipmentIncluded: 'publish-scope-equipment',
  taxesIncluded: 'publish-scope-taxes',
} as const;
