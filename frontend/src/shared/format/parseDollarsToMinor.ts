/* Parses a typed dollar amount into integer minor units without floating-point arithmetic.
   "1,875" and "$1875.50" work; anything ambiguous returns null so the form can say so. */
const AMOUNT = /^(\d+)(?:\.(\d{1,2}))?$/;

/** Return the amount in cents, or null when the text isn't a plain non-negative amount. */
export function parseDollarsToMinor(text: string): number | null {
  const cleaned = text.trim().replace(/^\$/, '').replace(/,/g, '');
  const match = AMOUNT.exec(cleaned);
  if (!match) {
    return null;
  }
  // String arithmetic on whole and fractional parts: 0.1 + 0.2 must never reach a price.
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0') || '0');
  return Number.isSafeInteger(cents) ? cents : null;
}
