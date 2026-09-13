/* Step 2, "Choose who to invite": every candidate, discovered or added by hand, with a select-all for the eligible
   ones and a sticky bar that leads to step 3, the exact email preview. Selecting never sends anything. */
import { Button, Card, Checkbox, Icon } from '../../../shared/ui';
import type { Candidate, ChannelInfo, Invitation } from '../types';
import { CandidateRow } from './CandidateRow';
import './CandidateList.css';

interface CandidateListProps {
  candidates: Candidate[];
  invitations: Invitation[];
  channel: ChannelInfo;
  selectedIds: Set<string>;
  recommendedCandidateIds: string[];
  removingId: string | null;
  onToggle: (candidateId: string) => void;
  onSelectAll: (candidateIds: string[]) => void;
  onSelectRecommended: (candidateIds: string[]) => void;
  onRemove: (candidateId: string) => void;
  onPreview: () => void;
  isPreviewing: boolean;
}

/** Render the candidate list and its selection bar. */
export function CandidateList(props: CandidateListProps): JSX.Element {
  const {
    candidates, invitations, channel, selectedIds, recommendedCandidateIds, removingId, onToggle,
    onSelectAll, onSelectRecommended, onRemove, onPreview, isPreviewing,
  } = props;
  const invitationById = new Map(invitations.map((invitation) => [invitation.id, invitation]));
  const eligibleIds = candidates.filter((candidate) => candidate.eligibility.can_invite).map((candidate) => candidate.id);
  const isAllSelected = eligibleIds.length > 0 && eligibleIds.every((id) => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  return (
    <Card
      actions={eligibleIds.length > 0 ? (
        <div className="candidate-list__actions">
          {recommendedCandidateIds.length > 0 ? (
            <Button onClick={() => onSelectRecommended(recommendedCandidateIds)} size="sm" variant="secondary">
              Select {recommendedCandidateIds.length} recommended
            </Button>
          ) : null}
          {eligibleIds.length > 1 ? (
            <Checkbox
              checked={isAllSelected}
              label={`Select all ${eligibleIds.length} who can be invited`}
              onChange={() => onSelectAll(isAllSelected ? [] : eligibleIds)}
            />
          ) : null}
        </div>
      ) : undefined}
      description="The first three inviteable results are a suggested outreach wave—not an AI quality ranking. You choose who receives it."
      padding="none"
      title="2. Choose who to invite"
    >
      {candidates.length === 0 ? (
        <p className="candidate-list__empty">No suppliers yet. Search above or add one you already know.</p>
      ) : (
        <ul className="candidate-list">
          {candidates.map((candidate) => (
            <CandidateRow
              candidate={candidate}
              channel={channel}
              invitation={candidate.invitation_id ? invitationById.get(candidate.invitation_id) ?? null : null}
              isRemoving={removingId === candidate.id}
              isSelected={selectedIds.has(candidate.id)}
              key={candidate.id}
              onRemove={() => onRemove(candidate.id)}
              onToggle={() => onToggle(candidate.id)}
            />
          ))}
        </ul>
      )}
      {selectedCount > 0 ? (
        <div className="candidate-list__bar">
          <span>
            <strong>{selectedCount}</strong> {selectedCount === 1 ? 'supplier' : 'suppliers'} selected
          </span>
          <Button iconEnd={<Icon name="arrow-right" size={16} />} isBusy={isPreviewing} onClick={onPreview} variant="primary">
            {isPreviewing ? 'Rendering…' : '3. Preview and approve'}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
