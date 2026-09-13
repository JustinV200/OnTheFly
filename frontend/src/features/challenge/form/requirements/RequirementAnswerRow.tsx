/* One requirement in the bid form: its text, priority, labor category and hours, the Included / Not included choice, and
   a note input that stays folded behind "Add note" until asked for. A note that already has text (a revision) starts
   open, so nothing the bidder wrote is ever hidden. Styled by RequirementAnswersFields.css, which its only parent imports. */
import { useState } from 'react';

import { perPeriodWords, requirementPriorityLabel } from '../../../../shared/market';
import { Button, Input, SegmentedControl, SegmentedOption } from '../../../../shared/ui';
import type { PublicRequirement } from '../../../publish/types';
import type { RequirementAnswer } from '../../buildChallengePayload';

type IncludedChoice = 'included' | 'not_included';

const OPTIONS: SegmentedOption<IncludedChoice>[] = [
  { value: 'included', label: 'Included' },
  { value: 'not_included', label: 'Not included' },
];

interface RequirementAnswerRowProps {
  requirement: PublicRequirement;
  answer: RequirementAnswer;
  // The listing's billing cadence; a requirement's hours are per that period.
  billingCadence: string;
  onChange: (patch: Partial<RequirementAnswer>) => void;
}

/** Render one requirement row as a list item. */
export function RequirementAnswerRow({ requirement, answer, billingCadence, onChange }: RequirementAnswerRowProps): JSX.Element {
  // Read once on mount (the form is re-keyed per stored version): a note cleared while typing keeps its input in view.
  const [isNoteShown, setIsNoteShown] = useState(() => answer.note.trim() !== '');
  // Only a click opens it with focus; a note that starts open must not steal focus when the page loads.
  const [shouldFocusNote, setShouldFocusNote] = useState(false);

  const openNote = (): void => {
    setShouldFocusNote(true);
    setIsNoteShown(true);
  };

  return (
    <li className="bid-requirements__row">
      <div className="bid-requirements__text">
        <span className="bid-requirements__name">{requirement.text}</span>
        <span className="bid-requirements__meta">
          {requirementPriorityLabel(requirement.priority)}
          {requirement.labor_category ? ` · ${requirement.labor_category}` : ''}
          {requirement.hours !== null ? ` · ${requirement.hours.toLocaleString('en-US')} h ${perPeriodWords(billingCadence)}` : ''}
        </span>
      </div>
      <div className="bid-requirements__controls">
        <SegmentedControl
          label={`${requirement.text}: in your price`}
          onChange={(choice) => onChange({ isIncluded: choice === 'included' })}
          options={OPTIONS}
          size="sm"
          value={answer.isIncluded === null ? null : answer.isIncluded ? 'included' : 'not_included'}
        />
        {answer.isIncluded === null ? <span className="bid-requirements__unanswered">Not answered</span> : null}
        {isNoteShown ? null : (
          <Button aria-label={`Add note on ${requirement.text}`} onClick={openNote} size="sm" variant="link">Add note</Button>
        )}
      </div>
      {isNoteShown ? (
        <Input
          aria-label={`Note on ${requirement.text}`}
          autoFocus={shouldFocusNote}
          className="bid-requirements__note"
          onChange={(event) => onChange({ note: event.target.value })}
          placeholder="Optional note, e.g. how you staff it"
          value={answer.note}
        />
      ) : null}
    </li>
  );
}
