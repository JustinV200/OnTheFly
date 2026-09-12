/* Displays integer minor-unit amounts as USD-formatted strings.
   Frontend display logic stays here instead of leaking into every feature row. */
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

  return <span>{formatter.format(amount)}</span>;
}
