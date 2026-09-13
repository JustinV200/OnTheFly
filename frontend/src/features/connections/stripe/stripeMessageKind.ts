/* Classifies a Stripe panel message so it renders as progress, a result, or a failure.
   Display only: the hook still decides what happened; this just picks how its words look. */
import { STRIPE_MESSAGES } from './stripeMessages';

export type StripeMessageKind = 'progress' | 'success' | 'cancelled' | 'timeout' | 'failure';

/** Return the kind of a non-empty hook message. Unrecognized text is a failure, so an error is never styled as success. */
export function stripeMessageKind(message: string): StripeMessageKind {
  switch (message) {
    case STRIPE_MESSAGES.waiting:
      return 'progress';
    case STRIPE_MESSAGES.imported:
      return 'success';
    case STRIPE_MESSAGES.cancelled:
      return 'cancelled';
    case STRIPE_MESSAGES.timedOut:
      return 'timeout';
    default:
      return 'failure';
  }
}
