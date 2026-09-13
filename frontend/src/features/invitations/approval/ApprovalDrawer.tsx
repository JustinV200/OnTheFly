/* Step 3, the approval gate (roadmap 08, step 5): before anything sends, the owner sees where it goes (channel), what
   the template guarantees (compliance), every recipient and anyone excluded with the reason, and each exact email.
   Approval is one explicit click, bound to the hash of this preview; if the email changed since, the server refuses. */
import { useState } from 'react';

import { ApiError } from '../../../shared/api/client';
import { ErrorState } from '../../../shared/components/ErrorState';
import { Badge, Button, Callout, Drawer, Icon, Select, Stack } from '../../../shared/ui';
import type { InvitationPreview } from '../types';
import { ComplianceChecklist } from './ComplianceChecklist';
import { EmailView } from './EmailView';
import './ApprovalDrawer.css';

interface ApprovalDrawerProps {
  preview: InvitationPreview | null;
  isApproving: boolean;
  approveError: ApiError | null;
  onApprove: () => void;
  onRefreshPreview: () => void;
  onClose: () => void;
}

/** Render the approval drawer for a rendered preview; closed when preview is null. */
export function ApprovalDrawer({ preview, isApproving, approveError, onApprove, onRefreshPreview, onClose }: ApprovalDrawerProps): JSX.Element {
  const [shownCandidateId, setShownCandidateId] = useState<string | null>(null);
  const messages = preview?.messages ?? [];
  const shown = messages.find((message) => message.candidate_id === shownCandidateId) ?? messages[0] ?? null;
  const count = messages.length;
  const isSendable = Boolean(preview && preview.compliance.ready && count > 0);

  return (
    <Drawer
      description={preview ? `Links to your public listing: ${preview.listing_url}` : undefined}
      footer={preview ? (
        <>
          <Button onClick={onClose} variant="ghost">Not now</Button>
          <Button disabled={!isSendable} iconStart={<Icon name="send" size={16} />} isBusy={isApproving} onClick={onApprove} variant="primary">
            {isApproving ? 'Sending…' : approveLabel(count, preview.channel.delivers_real_email)}
          </Button>
        </>
      ) : undefined}
      isOpen={preview !== null}
      onClose={onClose}
      title="Review and approve"
      width="lg"
    >
      {preview ? (
        <Stack gap={5}>
          <Callout
            role="note"
            title={preview.channel.delivers_real_email ? preview.channel.label : `${preview.channel.label}`}
            tone={preview.channel.delivers_real_email ? 'warning' : 'simulated'}
          >
            <p>
              {preview.channel.delivers_real_email
                ? 'Approving sends real email to the recipients below. Each supplier can only ever receive this invitation once.'
                : 'Approving stores these emails in the sandbox outbox for review. No email leaves this machine.'}
              {preview.channel.tracks_delivery ? '' : ' Delivery and opens are not tracked.'}
            </p>
          </Callout>

          {approveError ? (
            <ErrorState error={approveError} title={approveError.status === 409 ? 'Not sent: the email changed or isn’t ready' : 'Not sent'}>
              {approveError.status === 409 ? <Button onClick={onRefreshPreview} size="sm">Preview again</Button> : null}
            </ErrorState>
          ) : null}

          <section aria-labelledby="approval-compliance">
            <h3 className="approval-drawer__heading" id="approval-compliance">
              Template checks {preview.compliance.ready ? <Badge tone="success">Ready for this channel</Badge> : <Badge tone="danger">Not ready</Badge>}
            </h3>
            <ComplianceChecklist report={preview.compliance} />
          </section>

          <section aria-labelledby="approval-recipients">
            <h3 className="approval-drawer__heading" id="approval-recipients">Recipients ({count})</h3>
            <ul className="approval-drawer__recipients">
              {messages.map((message) => <li key={message.candidate_id}><strong>{message.to_name}</strong> · {message.to_email}</li>)}
            </ul>
            {preview.blocked.length > 0 ? (
              <Callout role="note" title={`${preview.blocked.length} left out`} tone="neutral">
                <ul className="approval-drawer__blocked">
                  {preview.blocked.map((item) => <li key={item.candidate_id}><strong>{item.business_name}</strong>: {item.reason}</li>)}
                </ul>
              </Callout>
            ) : null}
          </section>

          {shown ? (
            <section aria-labelledby="approval-email">
              <div className="approval-drawer__email-head">
                <h3 className="approval-drawer__heading" id="approval-email">The exact email</h3>
                {count > 1 ? (
                  <Select aria-label="Show the email to" onChange={(event) => setShownCandidateId(event.target.value)} value={shown.candidate_id}>
                    {messages.map((message) => <option key={message.candidate_id} value={message.candidate_id}>To {message.to_name}</option>)}
                  </Select>
                ) : null}
              </div>
              <EmailView body={shown.body_text} headers={shown.headers} />
              <p className="approval-drawer__note">
                Each supplier’s opt-out link is private to them, so its code is hidden here. Everything else is sent word for word.
              </p>
              <p className="approval-drawer__hash">Template {preview.template_version} · preview {preview.message_hash.slice(0, 12)}</p>
            </section>
          ) : null}
        </Stack>
      ) : null}
    </Drawer>
  );
}

function approveLabel(count: number, isRealEmail: boolean): string {
  const who = `${count} ${count === 1 ? 'supplier' : 'suppliers'}`;
  return isRealEmail ? `Approve and email ${who}` : `Approve and send ${who} to the sandbox`;
}
