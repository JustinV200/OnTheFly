/* Sends an owner from Spend's "no financial account connected" state to the Stripe sandbox row further down the same
   Data sources card: it opens any disclosure the row sits inside, scrolls it into view and focuses its connect button.
   DOM navigation only — it never connects or imports anything. */
import { STRIPE_CONNECT_BUTTON_ID } from '../../connections/stripe/stripeRowElementId';

/** Scroll to and focus the Stripe sandbox row's connect button. Returns false when that row isn't on the page, so a
    caller can say so rather than leaving a button that looks broken. */
export function focusStripeRow(): boolean {
  const button = document.getElementById(STRIPE_CONNECT_BUTTON_ID);
  if (!button) {
    return false;
  }

  // The row can sit inside a collapsed "Manage data sources" <details>, and a hidden element can't be focused or
  // scrolled to; open every ancestor first.
  let section = button.closest('details');
  while (section) {
    section.open = true;
    section = section.parentElement?.closest('details') ?? null;
  }

  button.scrollIntoView({ behavior: 'smooth', block: 'center' });
  // Focus without a second scroll, so the smooth one above isn't cut short by a jump.
  button.focus({ preventScroll: true });
  return true;
}
