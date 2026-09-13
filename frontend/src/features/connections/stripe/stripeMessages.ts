/* The fixed status messages useStripeConnection shows, named once so the panel can tell progress and results apart
   from failures without re-typing the strings. Any other message is a failure's own text (Stripe, the API, or config). */
export const STRIPE_MESSAGES = {
  imported: 'Stripe sandbox transactions imported.',
  waiting: 'Waiting for Stripe to prepare transactions…',
  cancelled: 'Connection cancelled. No account imported.',
  timedOut: 'Import timed out. Use Refresh to resume.',
} as const;
