/* Displays integer minor-unit amounts as USD-formatted strings.
   Frontend display logic stays here instead of leaking into every feature row.
   Tabular numerals and no line break inside the amount come from the system's .ui-money class. */
interface MoneyDisplayProps {
  amountMinor: number;
  currency: string;
}

/** Render a formatted money string for one minor-unit amount. */
export function MoneyDisplay({ amountMinor, currency }: MoneyDisplayProps): JSX.Element {
  const amount = amountMinor / 100;
  const formatter = new Intl.NumberFormat('en-US', {
    currency,
    style: 'currency',
  });

  return <span className="ui-money">{formatter.format(amount)}</span>;
}
