/* Turns a stored offer back into challenge form fields: the inverse of buildChallengePayload.
   A revision replaces every term, so the form starts from what was offered; a blank form would let a price-only
   edit silently drop the scope. Terms the form has no field for are not carried (see ExistingOfferNotice). */
import { formatMinorForInput } from '../../shared/format/formatMinorForInput';
import type { ChallengeFormFields } from './buildChallengePayload';
import type { StoredOffer } from './types';

// buildChallengePayload writes the visit count as exactly "Nx weekly"; other phrasings stay as typed text.
const VISITS_ITEM_RE = /^(\d+)x weekly$/;
// buildChallengePayload states equipment as this exact item, included or excluded. Longer phrases such as
// "equipment included" stay as text so their wording survives the round trip.
const EQUIPMENT_ITEM = 'equipment';

/** Return form fields that, submitted unchanged, restate the stored offer's terms.
    taskChoices are the task checkboxes the form shows. An included item naming one (ignoring case and padding, as
    scope scoring does) ticks it under the listing's spelling; every other item stays visible as text, never hidden. */
export function offerToFormFields(offer: StoredOffer, taskChoices: string[]): ChallengeFormFields {
  const tasks: string[] = [];
  const otherInclusions: string[] = [];
  const exclusions: string[] = [];
  let visitsPerWeek = '';
  let equipmentIncluded: boolean | null = null;

  for (const item of offer.scope_included) {
    const task = taskChoices.find((choice) => normalizeItem(choice) === normalizeItem(item));
    const visits = VISITS_ITEM_RE.exec(item.trim());
    if (task !== undefined && !tasks.includes(task)) {
      tasks.push(task);
    } else if (visits && visitsPerWeek === '') {
      visitsPerWeek = visits[1];
    } else if (item.trim() === EQUIPMENT_ITEM && equipmentIncluded === null) {
      equipmentIncluded = true;
    } else {
      // Includes a repeated task or a second visit count: kept as text so the resubmitted list matches the stored one.
      otherInclusions.push(item);
    }
  }
  for (const item of offer.scope_excluded) {
    // Only one equipment state fits the select; if both lists named it, the exclusion stays as visible text.
    if (item.trim() === EQUIPMENT_ITEM && equipmentIncluded === null) {
      equipmentIncluded = false;
    } else {
      exclusions.push(item);
    }
  }

  return {
    price: formatMinorForInput(offer.price_minor),
    billingFrequency: offer.billing_frequency,
    tasks,
    visitsPerWeek,
    equipmentIncluded,
    suppliesIncluded: offer.supplies_included,
    taxesIncluded: offer.taxes_included,
    // The form splits these on commas, which is how buildChallengePayload made the items in the first place.
    otherInclusions: otherInclusions.join(', '),
    exclusions: exclusions.join(', '),
    // Blank means no setup fee to buildChallengePayload, which sends it back as 0.
    setupFee: offer.setup_fee_minor > 0 ? formatMinorForInput(offer.setup_fee_minor) : '',
    minimumTerm: offer.minimum_term ?? '',
    availability: offer.availability ?? '',
    siteVisitRequired: offer.site_visit_required,
    message: offer.message_to_owner ?? '',
  };
}

function normalizeItem(item: string): string {
  // toLowerCase stands in for the backend's casefold; the two agree on the task names this demo uses.
  return item.trim().toLowerCase();
}
