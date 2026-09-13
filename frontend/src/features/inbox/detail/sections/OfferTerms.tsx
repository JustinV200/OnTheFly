/* The offer's terms exactly as the challenger gave them: price and billing as offered, setup fee, what it includes and
   excludes, and conditions. Unknown terms read "Not stated" rather than disappearing (CLAUDE.md, AI boundaries). */
import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../../shared/format/formatTimestamp';
import { cadenceSuffix } from '../../../../shared/market';
import type { OwnerChallenge } from '../../types';
import { Term, TermList } from '../TermList';

const NOT_STATED = 'Not stated';

/** Render the as-offered terms for one offer. */
export function OfferTerms({ offer }: { offer: OwnerChallenge }): JSX.Element {
  const money = (amountMinor: number): JSX.Element => <MoneyDisplay amountMinor={amountMinor} currency={offer.price_currency} />;
  const terms: Term[] = [
    { label: 'Price as offered', value: <>{money(offer.price_minor)} {cadenceSuffix(offer.billing_frequency)}</> },
    { label: 'Setup fee', value: offer.setup_fee_minor ? money(offer.setup_fee_minor) : 'None stated' },
    { label: 'Includes', value: offer.scope_included.join(', ') || NOT_STATED },
    { label: 'Excludes', value: offer.scope_excluded.join(', ') || NOT_STATED },
  ];
  if (offer.scope_extras.length) {
    terms.push({ label: 'Extras', value: offer.scope_extras.join(', ') });
  }
  terms.push(
    { label: 'Taxes included', value: describeTriState(offer.taxes_included) },
    { label: 'Supplies included', value: describeTriState(offer.supplies_included) },
    { label: 'Minimum term', value: offer.minimum_term ?? NOT_STATED },
    { label: 'Availability', value: offer.availability ?? NOT_STATED },
    { label: 'Site visit', value: offer.site_visit_required ? 'Required before the price is final' : 'Not required' },
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
