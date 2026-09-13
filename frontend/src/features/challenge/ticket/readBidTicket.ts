/* Reads the bid ticket the market page hands over in the URL (?price=1900&billing=monthly), validated at this boundary.
   A value that can't be read is dropped and flagged, never guessed: the field stays empty and the form says so. */
import { parseDollarsToMinor } from '../../../shared/format/parseDollarsToMinor';
import { BILLING_OPTIONS } from '../../../shared/market';

export interface BidTicket {
  // The price as the ticket typed it (dollars text, e.g. "1900"), or null when absent or unreadable.
  price: string | null;
  // One of the form's billing frequencies, or null when absent or not one of them.
  billingFrequency: string | null;
  // A param was present but couldn't be used; the form tells the challenger instead of pretending it prefilled.
  hasUnreadablePrice: boolean;
  hasUnreadableBilling: boolean;
}

/** Return the ticket's usable values from the page's search params. */
export function readBidTicket(searchParams: URLSearchParams): BidTicket {
  const rawPrice = searchParams.get('price');
  const rawBilling = searchParams.get('billing');
  const trimmedPrice = rawPrice?.trim() ?? '';
  const priceMinor = trimmedPrice ? parseDollarsToMinor(trimmedPrice) : null;
  // Zero is unreadable too: the server rejects a zero price, so prefilling one would only set up a failed submit.
  const isPriceUsable = priceMinor !== null && priceMinor > 0;
  const isBillingUsable = rawBilling !== null && BILLING_OPTIONS.some((option) => option.value === rawBilling);

  return {
    price: isPriceUsable ? trimmedPrice : null,
    billingFrequency: isBillingUsable ? rawBilling : null,
    // An empty param (a ticket submitted without a price) is treated as absent, not as unreadable.
    hasUnreadablePrice: trimmedPrice !== '' && !isPriceUsable,
    hasUnreadableBilling: Boolean(rawBilling) && !isBillingUsable,
  };
}
