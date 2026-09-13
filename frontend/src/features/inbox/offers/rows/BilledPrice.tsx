/* A price cell in the ranked list, in the period it is billed on: "$1,416,000.00 /yr" for an annual listing, "/mo" only
   for a monthly one. When only the server's per-month restatement is at hand, it says "per month, compared" in words
   instead of a bare "/mo" beside annual prices. Display only: the frontend never converts between periods. */
import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { cadenceSuffix } from '../../../../shared/market';

interface BilledPriceProps {
  amountMinor: number;
  currency: string;
  // The period amountMinor is billed on; null when amountMinor is the server's per-month comparison figure.
  cadence: string | null;
  // The server's per-month figure, shown under a billed price that the list ranks on a different basis; null omits it.
  comparedMonthlyMinor?: number | null;
}

/** Render the amount with its period, and the per-month comparison line when one is given. */
export function BilledPrice({ amountMinor, currency, cadence, comparedMonthlyMinor = null }: BilledPriceProps): JSX.Element {
  return (
    <>
      <span className="ranked-offers__price"><MoneyDisplay amountMinor={amountMinor} currency={currency} /></span>
      <span className="ranked-offers__period">{cadence === null ? ' per month, compared' : ` ${cadenceSuffix(cadence)}`}</span>
      {comparedMonthlyMinor !== null ? (
        <span className="ranked-offers__compared">
          Compared as <MoneyDisplay amountMinor={comparedMonthlyMinor} currency={currency} /> per month
        </span>
      ) : null}
    </>
  );
}
