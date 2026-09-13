/* Renders the task page's success message, prominently at the top: "Published. Bidders can find it on Markets.",
   "Ownership moved to <bidder>…", or "Piece split off: <title>. Remainder $A → $B /yr…" with the step that follows.
   The action that caused it (Accept, Split) usually sat far down the page and is gone now, so a new notice scrolls into
   view and takes focus; it is also a role="status" region. Dismiss clears it. */
import { useEffect, useRef } from 'react';

import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { cadenceSuffix } from '../../../shared/market';
import { Button, ButtonLink, Callout } from '../../../shared/ui';
import type { TaskNotice } from './taskNotice';
import './TaskNoticeCallout.css';

interface TaskNoticeCalloutProps {
  notice: TaskNotice | null;
  onDismiss: () => void;
}

/** Render the notice, or nothing. */
export function TaskNoticeCallout({ notice, onDismiss }: TaskNoticeCalloutProps): JSX.Element | null {
  const regionRef = useRef<HTMLDivElement>(null);

  // Keyed on the notice object: the page sets a new one per action, and polling never replaces it.
  useEffect(() => {
    const element = regionRef.current;
    if (!notice || !element) {
      return;
    }
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
    element.focus({ preventScroll: true });
  }, [notice]);

  if (!notice) {
    return null;
  }
  return (
    <div className="task-notice" ref={regionRef} tabIndex={-1}>
      <NoticeBody dismiss={<Button onClick={onDismiss} size="sm" variant="ghost">Dismiss</Button>} notice={notice} />
    </div>
  );
}

function NoticeBody({ notice, dismiss }: { notice: TaskNotice; dismiss: JSX.Element }): JSX.Element {
  if (notice.kind === 'published') {
    return (
      <Callout
        actions={(
          <>
            {notice.listingId ? <ButtonLink size="sm" to={`/listings/${notice.listingId}`}>View as a stranger</ButtonLink> : null}
            <ButtonLink size="sm" to="/marketplace">Go to Markets</ButtonLink>
            {dismiss}
          </>
        )}
        role="status"
        title="Published. Bidders can find it on Markets."
        titleLevel={2}
        tone="success"
      />
    );
  }

  if (notice.kind === 'accepted') {
    return (
      <Callout actions={dismiss} role="status" title={`Ownership moved to ${notice.bidderName}.`} titleLevel={2} tone="success">
        <p>{notice.bidderName} is responsible for the work now and is the only one who can split it.</p>
      </Callout>
    );
  }

  const unit = cadenceSuffix(notice.billingPeriod);
  const amount = (minor: number): JSX.Element => <MoneyDisplay amountMinor={minor} currency={notice.currency} />;
  return (
    <Callout
      actions={(
        <>
          <ButtonLink to={`/tasks/${notice.childTaskId}`} variant="primary">Open the piece to publish</ButtonLink>
          {dismiss}
        </>
      )}
      role="status"
      title={`Piece split off: ${notice.pieceTitle ?? 'untitled piece'}.`}
      titleLevel={2}
      tone="success"
    >
      <p>
        {notice.beforeMinor !== null && notice.afterMinor !== null ? (
          <>{notice.figureLabel} {amount(notice.beforeMinor)} → {amount(notice.afterMinor)} {unit}. </>
        ) : null}
        The piece is private until you publish it.
      </p>
    </Callout>
  );
}
