/* One supplier candidate: a selection checkbox (disabled with the reason when it can't be invited), how to reach it,
   where it came from and when, and its invitation state once invited. Source links are the evidence behind the row. */
import { formatRelativeTime } from '../../../shared/format/formatRelativeTime';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { Badge, Button, Disclosure, Icon } from '../../../shared/ui';
import { candidateSourceLabel, websiteHost } from '../labels/candidateSourceLabel';
import { invitationStateLabel } from '../labels/invitationStateLabel';
import type { Candidate, ChannelInfo, Invitation } from '../types';
import { CandidateEvidenceList } from './CandidateEvidenceList';
import './CandidateRow.css';

interface CandidateRowProps {
  candidate: Candidate;
  invitation: Invitation | null;
  channel: ChannelInfo;
  isSelected: boolean;
  isRemoving: boolean;
  onToggle: () => void;
  onRemove: () => void;
}

/** Render one candidate row. */
export function CandidateRow({ candidate, invitation, channel, isSelected, isRemoving, onToggle, onRemove }: CandidateRowProps): JSX.Element {
  const source = candidateSourceLabel(candidate);
  const checkboxId = `candidate-${candidate.id}`;
  const reasonId = `${checkboxId}-reason`;
  const state = invitation ? invitationStateLabel(invitation, channel) : null;
  const evidenceUrls = new Set(candidate.evidence.map((record) => record.url).filter((url): url is string => url !== null));

  return (
    <li className={`candidate-row${isSelected ? ' candidate-row--selected' : ''}`}>
      <input
        aria-describedby={candidate.eligibility.can_invite || state ? undefined : reasonId}
        checked={isSelected}
        className="candidate-row__check"
        disabled={!candidate.eligibility.can_invite}
        id={checkboxId}
        onChange={onToggle}
        type="checkbox"
      />
      <div className="candidate-row__body">
        <div className="candidate-row__top">
          <label className="candidate-row__name" htmlFor={checkboxId}>{candidate.business_name}</label>
          <Badge tone={source.tone}>{source.label}</Badge>
          {state ? <Badge title={state.explanation} tone={state.tone}>{state.label}</Badge> : null}
        </div>

        <p className="candidate-row__contact">
          {candidate.contact_email ? (
            <span><Icon name="mail" size={14} /> {candidate.contact_email}</span>
          ) : (
            <span className="candidate-row__missing">No published contact email</span>
          )}
          {candidate.website_url ? (
            <a href={candidate.website_url} rel="noreferrer noopener" target="_blank">
              {websiteHost(candidate.website_url)} <Icon name="external-link" size={12} />
            </a>
          ) : null}
          {candidate.service_area ? <span>{candidate.service_area}</span> : null}
          {candidate.supplier_uei ? <span>UEI {candidate.supplier_uei}</span> : null}
        </p>

        {candidate.capability_summary ? <p className="candidate-row__summary">{candidate.capability_summary}</p> : null}
        {/* An invited row already says where its invitation stands; repeating "Already invited" would be noise. */}
        {candidate.eligibility.can_invite || state ? null : (
          <p className="candidate-row__reason" id={reasonId}>{candidate.eligibility.reason ?? 'Can’t be invited.'}</p>
        )}

        {candidate.source_urls.length > 0 || candidate.retrieved_at ? (
          <Disclosure
            summary={candidate.retrieved_at
              ? `Sources · retrieved ${formatRelativeTime(candidate.retrieved_at)}`
              : `Sources (${candidate.source_urls.length})`}
          >
            {candidate.retrieved_at ? <p>Retrieved {formatTimestamp(candidate.retrieved_at)}.</p> : null}
            {candidate.evidence.length > 0 ? <CandidateEvidenceList evidence={candidate.evidence} /> : null}
            <ul className="candidate-row__sources">
              {/* Pages already listed as evidence aren't repeated; any other source URL still shows. */}
              {candidate.source_urls.filter((url) => !evidenceUrls.has(url)).map((url) => (
                <li key={url}><a href={url} rel="noreferrer noopener" target="_blank">{url}</a></li>
              ))}
              {candidate.contact_email_source_url && !candidate.source_urls.includes(candidate.contact_email_source_url) ? (
                <li>Email published at <a href={candidate.contact_email_source_url} rel="noreferrer noopener" target="_blank">{candidate.contact_email_source_url}</a></li>
              ) : null}
            </ul>
          </Disclosure>
        ) : null}
      </div>
      {candidate.invitation_id ? null : (
        <Button aria-label={`Remove ${candidate.business_name}`} className="candidate-row__remove" isBusy={isRemoving} onClick={onRemove} size="sm" variant="ghost">
          Remove
        </Button>
      )}
    </li>
  );
}
