/* A headline amount rounded to whole currency units, with the exact amount on hover and for screen readers.
   Display rounding only (roadmap 11, step 4 "Money"): the figure comes from integer minor units and is never used
   for further math. Rows and detail views keep exact amounts through MoneyDisplay. */
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';

interface WholeAmountProps {
  amountMinor: number;
  currency: string;
}

/** Render e.g. "$48,854" with "$48,853.72" in the tooltip and in visually hidden text. */
export function WholeAmount({ amountMinor, currency }: WholeAmountProps): JSX.Element {
  // The same divide-by-100 MoneyDisplay uses; only the fraction digits differ.
  const whole = new Intl.NumberFormat('en-US', { currency, maximumFractionDigits: 0, minimumFractionDigits: 0, style: 'currency' });
  const exact = new Intl.NumberFormat('en-US', { currency, style: 'currency' }).format(amountMinor / 100);

  return (
    <span className="ui-money" title={`Exactly ${exact}`}>
      <span aria-hidden="true">{whole.format(amountMinor / 100)}</span>
      <span className="ui-visually-hidden">
        <MoneyDisplay amountMinor={amountMinor} currency={currency} />
      </span>
    </span>
  );
}
