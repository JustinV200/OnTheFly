/* Formats integer minor units as editable dollar text ("2400.00") using integer math only.
   The inverse of parseDollarsToMinor, for prefilling price inputs. */

/** Return "whole.cents" text for a non-negative minor-unit amount. */
export function formatMinorForInput(amountMinor: number): string {
  const whole = Math.floor(Math.abs(amountMinor) / 100);
  const cents = Math.abs(amountMinor) % 100;
  return `${amountMinor < 0 ? '-' : ''}${whole}.${String(cents).padStart(2, '0')}`;
}
