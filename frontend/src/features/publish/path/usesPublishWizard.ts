/* Decides which flow puts an expense up for bids: REBID with requirement rows (/tasks/new?expense=, roadmap 12), or this
   feature's older publish wizard (/publish). The wizard asks the commercial-cleaning scenario's questions (square footage,
   visits, bathrooms) and writes no requirement rows, so it stays only for the categories it has field sets for. Every other
   category REBIDs, which Ways to save and piece splitting read. Both paths still end at the exact preview before publishing. */
import { hasCategoryFieldSet } from '../form/template/categoryFieldSet';

/** True when an expense or listing of this category is published through the wizard rather than REBID. */
export function usesPublishWizard(category: string | null): boolean {
  return hasCategoryFieldSet(category);
}
