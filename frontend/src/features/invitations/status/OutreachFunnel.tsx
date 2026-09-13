/* The story in one row: "4 invited · 4 in sandbox outbox · delivery not tracked · 1 bid received" (roadmap 08, step 8).
   Counts come from the server's summary. Delivery is stated as not tracked rather than left out, so "sent" is never read
   as "delivered". */
import { Stat } from '../../../shared/ui';
import type { ChannelInfo, OutreachSummary } from '../types';
import './OutreachFunnel.css';

interface OutreachFunnelProps {
  summary: OutreachSummary;
  channel: ChannelInfo;
}

/** Render the invitation funnel tiles. */
export function OutreachFunnel({ summary, channel }: OutreachFunnelProps): JSX.Element {
  const pending = summary.queued + summary.sending;
  return (
    <div aria-label="Invitation summary" className="outreach-funnel" role="group">
      <Stat caption={pending > 0 ? `${pending} waiting to send` : undefined} label="Invited" size="md" value={summary.invited} />
      <Stat
        caption={channel.delivers_real_email ? 'Accepted by the mail server' : 'Stored for review, not emailed'}
        label={channel.delivers_real_email ? 'Sent' : 'In sandbox outbox'}
        size="md"
        value={summary.sent}
      />
      <Stat caption={summary.delivery_tracked ? undefined : 'This channel can’t see inboxes'} label="Delivered" size="md" value={summary.delivery_tracked ? '—' : 'Not tracked'} />
      <Stat caption="Matched by account email" label="Bids received" size="md" tone={summary.challenged > 0 ? 'success' : 'default'} value={summary.challenged} />
      {summary.failed + summary.suppressed > 0 ? (
        <Stat caption={`${summary.failed} failed · ${summary.suppressed} opted out`} label="Not sent" size="md" tone="danger" value={summary.failed + summary.suppressed} />
      ) : null}
    </div>
  );
}
