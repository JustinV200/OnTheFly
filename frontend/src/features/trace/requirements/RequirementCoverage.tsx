/* The Scope step's body for a listing scoped as requirement rows: how this offer answered each requirement, in the wording
   of the scope version it answered, instead of the on-site fields (square footage, visits) such a listing never states.
   An offer with no stored answers (from before per-requirement answers) shows the requirement list and says so. */
import { requirementPriorityLabel } from '../../../shared/market';
import { RequirementAnswerItem, RequirementAnswerList } from '../../../shared/offers/RequirementAnswerList';
import { Stack } from '../../../shared/ui';
import type { PublicRequirement } from '../../publish/types';

interface RequirementCoverageProps {
  // The answered scope version's requirement rows.
  requirements: PublicRequirement[];
  answers: RequirementAnswerItem[];
}

/** Render the offer's per-requirement coverage, or the bare requirement list when it has no stored answers. */
export function RequirementCoverage({ requirements, answers }: RequirementCoverageProps): JSX.Element {
  if (answers.length === 0) {
    return (
      <Stack gap={2}>
        <p className="ui-text-sm ui-text-muted">This offer has no per-requirement answers stored. The scope it answered asks for:</p>
        <ul className="ui-text-sm">
          {requirements.map((requirement) => (
            <li key={requirement.key}>{requirement.text} ({requirementPriorityLabel(requirement.priority)})</li>
          ))}
        </ul>
      </Stack>
    );
  }

  const includedCount = answers.filter((answer) => answer.is_included).length;
  return (
    <Stack gap={2}>
      <p className="ui-text-sm ui-text-muted">{includedCount} of {answers.length} requirements included in this offer’s price.</p>
      <RequirementAnswerList answers={answers} notePrefix="Bidder’s note" requirements={requirements} />
    </Stack>
  );
}
