/* Shows what the Stripe panel is doing or what just happened: progress beside a spinner, a result, or a failure.
   The polite live region is always rendered so progress changes are announced; timeouts and failures announce as alerts. */
import { Callout, Spinner } from '../../../shared/ui';
import { stripeMessageKind } from './stripeMessageKind';
import './StripeStatusNotice.css';

interface StripeStatusNoticeProps {
  message: string;
  busy: boolean;
  // True until the first connection status response settles (derived by the panel; the hook has no loading flag).
  isCheckingStatus: boolean;
}

/** Render the Stripe panel's progress, result, or failure message; renders an empty live region when idle. */
export function StripeStatusNotice({ message, busy, isCheckingStatus }: StripeStatusNoticeProps): JSX.Element {
  const kind = message ? stripeMessageKind(message) : null;
  // A running connect or import with no message yet is still progress, so it reads as "Connecting…", never as idle.
  const progressText = isCheckingStatus
    ? 'Checking the Stripe sandbox connection…'
    : kind === 'progress' ? message : !message && busy ? 'Connecting…' : null;

  return (
    <>
      <div aria-live="polite" className="stripe-status" role="status">
        {progressText ? (
          <p className="stripe-status__progress">
            <Spinner size="sm" />
            {progressText}
          </p>
        ) : null}
        {kind === 'success' ? <Callout tone="success">{message}</Callout> : null}
        {kind === 'cancelled' ? <Callout tone="neutral">{message}</Callout> : null}
      </div>
      {kind === 'timeout' ? <Callout role="alert" tone="warning">{message}</Callout> : null}
      {kind === 'failure' ? <Callout role="alert" tone="danger">{message}</Callout> : null}
    </>
  );
}
