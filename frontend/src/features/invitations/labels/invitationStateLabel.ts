/* Words and tones for an invitation's state. The words are careful about what the channel can know:
   "sent" means the channel accepted it, never "delivered" or "opened", which nothing here tracks (roadmap 08, step 8). */
import type { BadgeTone } from '../../../shared/ui';
import type { ChannelInfo, Invitation } from '../types';

export interface StateLabel {
  label: string;
  tone: BadgeTone;
  // One sentence for a tooltip or the detail drawer.
  explanation: string;
}

/** Describe an invitation's display state for the channel it went through. */
export function invitationStateLabel(invitation: Invitation, channel: ChannelInfo): StateLabel {
  switch (invitation.display_state) {
    case 'challenged':
      return {
        label: 'Bid received',
        tone: 'success',
        explanation: 'The invited business’s account submitted an offer on this listing after the invitation was sent. Matched by the exact email on its account, not a tracking link.',
      };
    case 'sent':
      return channel.delivers_real_email
        ? { label: 'Sent', tone: 'info', explanation: 'The mail server accepted it. Delivery and opens are not tracked.' }
        : { label: 'In sandbox outbox', tone: 'simulated', explanation: 'Stored in the sandbox outbox for review. No email left this machine.' };
    case 'queued':
      return invitation.next_attempt_at
        ? { label: 'Retry scheduled', tone: 'warning', explanation: 'A temporary failure; it will be tried again. It is never sent twice.' }
        : { label: 'Queued', tone: 'neutral', explanation: 'Approved and waiting to send.' };
    case 'sending':
      return {
        label: 'Outcome unknown',
        tone: 'warning',
        explanation: 'A send started but its result was not recorded. It is not retried automatically, so it can never be sent twice; check the channel before inviting again by hand.',
      };
    case 'failed':
      return { label: 'Failed', tone: 'danger', explanation: invitation.failure_reason ?? 'The channel refused it.' };
    case 'suppressed':
      return { label: 'Opted out', tone: 'private', explanation: 'The recipient opted out of invitations, so nothing was sent.' };
    default:
      // A state this page doesn't know yet is shown as-is, never as a success.
      return { label: invitation.display_state, tone: 'neutral', explanation: 'Unrecognised state.' };
  }
}
