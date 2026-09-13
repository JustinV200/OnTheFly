/* Decides the bid form's starting fields: the stored offer when the challenger has one (a revision replaces every term,
   so a blank form would silently drop them), otherwise an empty form; then the bid ticket's price and billing, when
   usable, replace just those two fields. It also reports what came from where, so the form can say so. */
import type { ChallengeFormFields } from '../buildChallengePayload';
import { offerToFormFields } from '../offerToFormFields';
import type { StoredOffer } from '../types';
import type { BidTicket } from './readBidTicket';

const EMPTY_FIELDS: ChallengeFormFields = {
  price: '',
  billingFrequency: 'monthly',
  tasks: [],
  visitsPerWeek: '',
  equipmentIncluded: null,
  suppliesIncluded: null,
  taxesIncluded: null,
  otherInclusions: '',
  exclusions: '',
  setupFee: '',
  minimumTerm: '',
  availability: '',
  siteVisitRequired: false,
  message: '',
};

export interface TicketOrigin {
  isPriceFromTicket: boolean;
  isBillingFromTicket: boolean;
  // Whether the remaining terms come from the challenger's stored offer rather than a blank form.
  isOverStoredOffer: boolean;
  hasUnreadablePrice: boolean;
  hasUnreadableBilling: boolean;
}

export interface SeededFields {
  fields: ChallengeFormFields;
  origin: TicketOrigin;
}

/** Return the starting fields. taskChoices are the task checkboxes the form shows; ticket is null once this page has
    stored a version, since the ticket described the offer before that submit, not the one being revised now. */
export function seedOfferFields(initialOffer: StoredOffer | null, taskChoices: string[], ticket: BidTicket | null): SeededFields {
  const base = initialOffer ? offerToFormFields(initialOffer, taskChoices) : EMPTY_FIELDS;
  const price = ticket?.price ?? null;
  const billingFrequency = ticket?.billingFrequency ?? null;

  return {
    fields: {
      ...base,
      ...(price !== null ? { price } : {}),
      ...(billingFrequency !== null ? { billingFrequency } : {}),
    },
    origin: {
      isPriceFromTicket: price !== null,
      isBillingFromTicket: billingFrequency !== null,
      isOverStoredOffer: initialOffer !== null,
      hasUnreadablePrice: ticket?.hasUnreadablePrice ?? false,
      hasUnreadableBilling: ticket?.hasUnreadableBilling ?? false,
    },
  };
}
