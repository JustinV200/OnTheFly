/* Converts the challenge form's fields into the API payload, in the vocabulary scope comparison scores.
   Tasks, "Nx weekly", and "equipment" are the strings backend comparison/normalize.py looks for. */
import { parseDollarsToMinor } from '../../shared/format/parseDollarsToMinor';
import type { BiddingModeValue, ChallengePayload } from './types';

export interface ChallengeFormFields {
  price: string;
  billingFrequency: string;
  tasks: string[];
  visitsPerWeek: string;
  equipmentIncluded: boolean | null;
  suppliesIncluded: boolean | null;
  taxesIncluded: boolean | null;
  otherInclusions: string;
  exclusions: string;
  setupFee: string;
  minimumTerm: string;
  availability: string;
  siteVisitRequired: boolean;
  message: string;
}

export type BuildResult = { payload: ChallengePayload } | { error: string };

/** Validate the fields and build the payload, or return the first problem as a sentence. */
export function buildChallengePayload(fields: ChallengeFormFields, acknowledgedMode: BiddingModeValue): BuildResult {
  const priceMinor = parseDollarsToMinor(fields.price);
  if (priceMinor === null || priceMinor === 0) {
    return { error: 'Enter your price in dollars, for example 1875 or 1,875.00.' };
  }
  const setupFeeMinor = fields.setupFee.trim() ? parseDollarsToMinor(fields.setupFee) : 0;
  if (setupFeeMinor === null) {
    return { error: 'Enter the setup fee in dollars, or leave it blank for none.' };
  }
  const visits = fields.visitsPerWeek.trim();
  if (visits && !/^\d+$/.test(visits)) {
    return { error: 'Visits per week must be a whole number, or blank if you are not stating it.' };
  }

  const included = [...fields.tasks, ...splitList(fields.otherInclusions)];
  const excluded = splitList(fields.exclusions);
  if (visits) {
    included.push(`${visits}x weekly`);
  }
  // Equipment has no boolean column on offers, so it is stated as an inclusion or an exclusion.
  if (fields.equipmentIncluded === true) {
    included.push('equipment');
  } else if (fields.equipmentIncluded === false) {
    excluded.push('equipment');
  }

  return {
    payload: {
      acknowledged_bidding_mode: acknowledgedMode,
      price_minor: priceMinor,
      billing_frequency: fields.billingFrequency,
      scope_included: included,
      scope_excluded: excluded,
      scope_extras: [],
      setup_fee_minor: setupFeeMinor,
      supplies_included: fields.suppliesIncluded,
      taxes_included: fields.taxesIncluded,
      minimum_term: fields.minimumTerm.trim() || null,
      availability: fields.availability.trim() || null,
      site_visit_required: fields.siteVisitRequired,
      message_to_owner: fields.message.trim() || null,
    },
  };
}

function splitList(text: string): string[] {
  return text.split(',').map((item) => item.trim()).filter(Boolean);
}
