/* The three steps the owner moves between. Separate from usePublish's PublishStep, which tracks the API calls:
   the owner can go Back to Scope while a fresh preview is still held. */
export type WizardStep = 'scope' | 'preview' | 'publish';
