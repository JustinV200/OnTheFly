/* Formats minor units as plain money text for sentences and captions, where a MoneyDisplay element can't go
   (a string prop, a title attribute). Display only; the amount is never recomputed. */

/** Return "$1,234.56"-style text for a minor-unit amount in the given currency. */
export function formatMoneyText(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { currency, style: 'currency' }).format(amountMinor / 100);
}
