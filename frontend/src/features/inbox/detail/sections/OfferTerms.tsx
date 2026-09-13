/* The offer's terms exactly as the bidder gave them: price and billing as offered, setup fee, what it includes and
   excludes, and conditions. Unknown terms read "Not stated" rather than disappearing (CLAUDE.md, AI boundaries).
   On a requirement listing the answers above carry what's included, so the free-text lists and the on-site terms (taxes,
   supplies, site visit) the bid form doesn't ask there are shown only when the bidder actually stated them. */
import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../../shared/format/formatTimestamp';
import { cadenceSuffix } from '../../../../shared/market';
import type { OwnerChallenge } from '../../types';
import { Term, TermList } from '../TermList';

const NOT_STATED = 'Not stated';

interface OfferTermsProps {
  offer: OwnerChallenge;
  // True when the offer answered requirement rows, which the drawer lists in its scope section.
  hasRequirementAnswers: boolean;
}

/** Render the as-offered terms for one offer. */
export function OfferTerms({ offer, hasRequirementAnswers }: OfferTermsProps): JSX.Element {
  const money = (amountMinor: number): JSX.Element => <MoneyDisplay amountMinor={amountMinor} currency={offer.price_currency} />;
  const terms: Term[] = [
    { label: 'Price as offered', value: <>{money(offer.price_minor)} {cadenceSuffix(offer.billing_frequency)}</> },
    { label: 'Setup fee', value: offer.setup_fee_minor ? money(offer.setup_fee_minor) : 'None stated' },
  ];
  if (!hasRequirementAnswers || offer.scope_included.length) {
    terms.push({ label: hasRequirementAnswers ? 'Also includes' : 'Includes', value: offer.scope_included.join(', ') || NOT_STATED });
  }
  if (!hasRequirementAnswers || offer.scope_excluded.length) {
    terms.push({ label: 'Excludes', value: offer.scope_excluded.join(', ') || NOT_STATED });
  }
  if (offer.scope_extras.length) {
    terms.push({ label: 'Extras', value: offer.scope_extras.join(', ') });
  }
  if (!hasRequirementAnswers || offer.taxes_included !== null) {
    terms.push({ label: 'Taxes included', value: describeTriState(offer.taxes_included) });
  }
  if (!hasRequirementAnswers || offer.supplies_included !== null) {
    terms.push({ label: 'Supplies included', value: describeTriState(offer.supplies_included) });
  }
  terms.push(
    { label: 'Minimum term', value: offer.minimum_term ?? NOT_STATED },
    { label: 'Availability', value: offer.availability ?? NOT_STATED },
  );
  if (!hasRequirementAnswers || offer.site_visit_required) {
    terms.push({ label: 'Site visit', value: offer.site_visit_required ? 'Required before the price is final' : 'Not required' });
  }
  terms.push(
    { label: 'Offer expires', value: offer.offer_expiry ? formatTimestamp(offer.offer_expiry) : NOT_STATED },
    { label: 'Other conditions', value: offer.other_conditions ?? 'None stated' },
  );
  return <TermList terms={terms} />;
}

function describeTriState(value: boolean | null): string {
  if (value === null) {
    return NOT_STATED;
  }
  return value ? 'Yes' : 'No';
}
