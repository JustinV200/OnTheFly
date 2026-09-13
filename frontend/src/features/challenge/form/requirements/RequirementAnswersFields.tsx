/* "What your price includes" for a listing scoped as requirement rows: one row per requirement with its labor category and
   hours, Included / Not included, and an optional note. "Include every requirement" is an explicit shortcut, never a
   default, and an unanswered row stays visibly unanswered: the server refuses an offer that skips one (roadmap 12, step 2). */
import { Button, Card, Input, SegmentedControl, SegmentedOption, Stack } from '../../../../shared/ui';
import type { PublicListingProjection } from '../../../publish/types';
import type { RequirementAnswer } from '../../buildChallengePayload';
import './RequirementAnswersFields.css';

type IncludedChoice = 'included' | 'not_included';

const OPTIONS: SegmentedOption<IncludedChoice>[] = [
  { value: 'included', label: 'Included' },
  { value: 'not_included', label: 'Not included' },
];

interface RequirementAnswersFieldsProps {
  listing: PublicListingProjection;
  answers: Record<string, RequirementAnswer>;
  onChange: (answers: Record<string, RequirementAnswer>) => void;
}

/** Render the requirement answer rows and the include-everything shortcut. */
export function RequirementAnswersFields({ listing, answers, onChange }: RequirementAnswersFieldsProps): JSX.Element {
  const requirements = listing.requirements ?? [];
  const answeredCount = requirements.filter((requirement) => answers[requirement.key]?.isIncluded != null).length;

  const setAnswer = (key: string, patch: Partial<RequirementAnswer>): void => {
    const current = answers[key] ?? { isIncluded: null, note: '' };
    onChange({ ...answers, [key]: { ...current, ...patch } });
  };
  const includeEverything = (): void => {
    onChange(Object.fromEntries(requirements.map((requirement) => [requirement.key, { isIncluded: true, note: answers[requirement.key]?.note ?? '' }])));
  };

  return (
    <Card
      description={`${answeredCount} of ${requirements.length} answered. Your price is scored on what it includes, before price.`}
      title="What your price includes"
    >
      <Stack gap={4}>
        <div className="bid-requirements__match">
          <Button onClick={includeEverything} size="sm">Include every requirement</Button>
          <span className="ui-text-sm ui-text-muted">Marks every row Included. Check each one before submitting.</span>
        </div>
        <ul className="bid-requirements__list">
          {requirements.map((requirement) => {
            const answer = answers[requirement.key] ?? { isIncluded: null, note: '' };
            return (
              <li className="bid-requirements__row" key={requirement.key}>
                <div className="bid-requirements__text">
                  <span className="bid-requirements__name">{requirement.text}</span>
                  <span className="bid-requirements__meta">
                    {requirement.priority === 'should' ? 'Nice to have' : 'Required'}
                    {requirement.labor_category ? ` · ${requirement.labor_category}` : ''}
                    {requirement.hours !== null ? ` · ${requirement.hours.toLocaleString('en-US')} h per ${listing.billing_cadence} period` : ''}
                  </span>
                </div>
                <div className="bid-requirements__controls">
                  <SegmentedControl
                    label={`${requirement.text}: in your price`}
                    onChange={(choice) => setAnswer(requirement.key, { isIncluded: choice === 'included' })}
                    options={OPTIONS}
                    size="sm"
                    value={answer.isIncluded === null ? null : answer.isIncluded ? 'included' : 'not_included'}
                  />
                  {answer.isIncluded === null ? <span className="bid-requirements__unanswered">Not answered</span> : null}
                  <Input
                    aria-label={`Note on ${requirement.text}`}
                    className="bid-requirements__note"
                    onChange={(event) => setAnswer(requirement.key, { note: event.target.value })}
                    placeholder="Optional note, e.g. how you staff it"
                    value={answer.note}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </Stack>
    </Card>
  );
}
