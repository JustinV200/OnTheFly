/* What the approve click just did, in words: how many were sent (or stored in the sandbox), retried, failed, or
   skipped as opted out. A replayed approval (a double click) says nothing new was sent. */
import { Callout } from '../../../shared/ui';
import type { ApproveInvitationsResponse, ChannelInfo } from '../types';

interface ApprovalResultProps {
  result: ApproveInvitationsResponse;
  channel: ChannelInfo;
}

/** Render the status callout for the last approval. */
export function ApprovalResult({ result, channel }: ApprovalResultProps): JSX.Element {
  const { queue } = result;
  if (result.replayed) {
    return (
      <Callout role="status" title="Already approved" tone="neutral">
        <p>This batch was approved before, so nothing new was created or sent. Each supplier gets an invitation at most once.</p>
      </Callout>
    );
  }
  const parts = [
    `${queue.sent} ${channel.delivers_real_email ? 'sent' : 'stored in the sandbox outbox'}`,
    queue.retry_scheduled > 0 ? `${queue.retry_scheduled} will retry` : null,
    queue.failed > 0 ? `${queue.failed} failed` : null,
    queue.suppressed > 0 ? `${queue.suppressed} opted out, not sent` : null,
    queue.skipped > 0 ? `${queue.skipped} left queued` : null,
  ].filter(Boolean);
  const hasProblem = queue.failed > 0 || queue.skipped > 0;

  return (
    <Callout role="status" title={`Approved ${result.invitations.length} ${result.invitations.length === 1 ? 'invitation' : 'invitations'}`} tone={hasProblem ? 'warning' : 'success'}>
      <p>{parts.join(' · ')}.{channel.delivers_real_email ? '' : ' No email left this machine.'}</p>
    </Callout>
  );
}
