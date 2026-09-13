/* "What your price includes" for a listing scoped as requirement rows: one row per requirement, Included / Not included,
   and an optional note behind "Add note". "Include every requirement" is an explicit shortcut, never a default, and an
   unanswered row stays visibly unanswered: the server refuses an offer that skips one (roadmap 12, step 2). */
import { Button, Card, Stack } from '../../../../shared/ui';
import type { PublicListingProjection } from '../../../publish/types';
import type { RequirementAnswer } from '../../buildChallengePayload';
import { RequirementAnswerRow } from './RequirementAnswerRow';
import './RequirementAnswersFields.css';

const UNANSWERED: RequirementAnswer = { isIncluded: null, note: '' };

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
    onChange({ ...answers, [key]: { ...(answers[key] ?? UNANSWERED), ...patch } });
  };
  const includeEverything = (): void => {
    onChange(Object.fromEntries(requirements.map((requirement) => [requirement.key, { isIncluded: true, note: answers[requirement.key]?.note ?? '' }])));
  };

  return (
    <Card
      description={`${answeredCount} of ${requirements.length} answered. Offers are compared on what they include before price.`}
      title="What your price includes"
    >
      <Stack gap={4}>
        <div className="bid-requirements__match">
          <Button onClick={includeEverything} size="sm">Include every requirement</Button>
          <span className="ui-text-sm ui-text-muted">Marks every row Included. Check each one before submitting.</span>
        </div>
        <ul className="bid-requirements__list">
          {requirements.map((requirement) => (
            <RequirementAnswerRow
              answer={answers[requirement.key] ?? UNANSWERED}
              billingCadence={listing.billing_cadence}
              key={requirement.key}
              onChange={(patch) => setAnswer(requirement.key, patch)}
              requirement={requirement}
            />
          ))}
        </ul>
      </Stack>
    </Card>
  );
}
