/* Checks the scope form before a preview is requested, field by field, so a typo is reported beside its input.
   Blank optional fields are valid (they publish as not stated); text that can't be read is an error rather than a silent blank. */
import { parseDollarsToMinor } from '../../../../shared/format/parseDollarsToMinor';
import type { CategoryFieldSet } from '../template/categoryFieldSet';
import type { ScopeFormValues } from './scopeFormValues';

export interface ScopeFormErrors {
  currentPrice?: string;
  billingCadence?: string;
  squareFootage?: string;
  bathroomCount?: string;
}

const WHOLE_NUMBER = /^\d+$/;

/** Return a message per invalid field; an empty object means the form can be previewed. */
export function validateScopeForm(values: ScopeFormValues, fieldSet: CategoryFieldSet): ScopeFormErrors {
  const errors: ScopeFormErrors = {};
  const priceMinor = parseDollarsToMinor(values.currentPrice);
  if (priceMinor === null || priceMinor === 0) {
    errors.currentPrice = 'Enter the current price in dollars, for example 2400 or 2,400.00.';
  }
  if (!values.billingCadence) {
    errors.billingCadence = 'Choose how often that price is charged.';
  }
  if (!isBlankOrWholeNumber(values.squareFootage)) {
    errors.squareFootage = 'Use a whole number, for example 8,000, or leave it blank.';
  }
  if (fieldSet.hasBathrooms && !isBlankOrWholeNumber(values.bathroomCount)) {
    errors.bathroomCount = 'Use a whole number, or leave it blank.';
  }
  return errors;
}

function isBlankOrWholeNumber(text: string): boolean {
  const trimmed = text.trim().replace(/,/g, '');
  return trimmed === '' || WHOLE_NUMBER.test(trimmed);
}
