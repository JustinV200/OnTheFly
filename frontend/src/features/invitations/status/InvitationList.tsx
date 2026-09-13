/* Step 4, "Invitations": per supplier, the state in careful words, when it was sent, attempts and failure reasons, and
   the exact stored email one click away. "Retry now" only resends invitations waiting on a scheduled retry; the server
   never sends one twice. */
import { useState } from 'react';

import { formatRelativeTime } from '../../../shared/format/formatRelativeTime';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { Badge, Button, Card, Drawer, Icon } from '../../../shared/ui';
import { EmailView } from '../approval/EmailView';
import { invitationStateLabel } from '../labels/invitationStateLabel';
import type { ChannelInfo, Invitation } from '../types';
import './InvitationList.css';

interface InvitationListProps {
  invitations: Invitation[];
  channel: ChannelInfo;
  isRetrying: boolean;
  onRetry: () => void;
}

/** Render the invitation status list. */
export function InvitationList({ invitations, channel, isRetrying, onRetry }: InvitationListProps): JSX.Element {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = invitations.find((invitation) => invitation.id === openId) ?? null;
  const hasRetry = invitations.some((invitation) => invitation.state === 'queued');

  return (
    <Card
      actions={hasRetry ? <Button isBusy={isRetrying} onClick={onRetry} size="sm">Retry now</Button> : undefined}
      description="Attribution is by account: a supplier shows “Bid received” when the business with that email bids on this listing."
      padding="none"
      title="Invitations"
    >
      <ul className="invitation-list">
        {invitations.map((invitation) => {
          const state = invitationStateLabel(invitation, channel);
          return (
            <li className="invitation-list__row" key={invitation.id}>
              <div className="invitation-list__who">
                <p className="invitation-list__name">{invitation.recipient_name}</p>
                <p className="invitation-list__email">{invitation.recipient_email}</p>
              </div>
              <div className="invitation-list__state">
                <Badge title={state.explanation} tone={state.tone}>{state.label}</Badge>
                <p className="invitation-list__when">
                  {invitation.challenged_at ? <span title={formatTimestamp(invitation.challenged_at)}>Bid {formatRelativeTime(invitation.challenged_at)}</span>
                    : invitation.sent_at ? <span title={formatTimestamp(invitation.sent_at)}>Sent {formatRelativeTime(invitation.sent_at)}</span>
                      : invitation.next_attempt_at ? <span title={formatTimestamp(invitation.next_attempt_at)}>Next try {formatRelativeTime(invitation.next_attempt_at)}</span>
                        : null}
                  {invitation.attempt_count > 1 ? ` · ${invitation.attempt_count} attempts` : ''}
                </p>
                {invitation.failure_reason ? <p className="invitation-list__failure">{invitation.failure_reason}</p> : null}
              </div>
              <Button iconStart={<Icon name="mail" size={15} />} onClick={() => setOpenId(invitation.id)} size="sm" variant="ghost">
                View email
              </Button>
            </li>
          );
        })}
      </ul>

      <Drawer
        description={open ? `${invitationStateLabel(open, channel).label} · approved ${formatTimestamp(open.created_at)}` : undefined}
        isOpen={open !== null}
        onClose={() => setOpenId(null)}
        title={open ? `Invitation to ${open.recipient_name}` : ''}
        width="lg"
      >
        {open ? <EmailView body={open.body_text} headers={open.headers} /> : null}
      </Drawer>
    </Card>
  );
}
