/* The Scope step's body for a listing scoped as requirement rows: how this offer answered each requirement, instead of the
   on-site fields (square footage, visits) that such a listing never states. When the offer's answers can't be loaded
   (it is no longer an active offer), the requirement list is shown on its own and says so, never as if answered. */
import { requirementPriorityLabel } from '../../../shared/market';
import { RequirementAnswerList } from '../../../shared/offers/RequirementAnswerList';
import { Stack } from '../../../shared/ui';
import type { PublicRequirement } from '../../publish/types';
import type { TraceRequirementAnswer } from './useTraceRequirements';

interface RequirementCoverageProps {
  // The listing's current requirement rows.
  requirements: PublicRequirement[];
  // This offer's answers, or null when they couldn't be found among the listing's active offers.
  answers: TraceRequirementAnswer[] | null;
  // False when the offer answered an earlier scope version; the wording shown is then the current version's.
  isCurrentScope: boolean;
  currentScopeVersionNumber: number;
}

/** Render the offer's per-requirement coverage, or the bare requirement list when its answers are unavailable. */
export function RequirementCoverage({ requirements, answers, isCurrentScope, currentScopeVersionNumber }: RequirementCoverageProps): JSX.Element {
  // Requirement keys are stable across scope versions, so an earlier version's answers still match; only the text may differ.
  const wordingNote = isCurrentScope ? '' : ` Requirement wording is from the listing’s current scope, version ${currentScopeVersionNumber}.`;

  if (answers === null) {
    return (
      <Stack gap={2}>
        <p className="ui-text-sm ui-text-muted">
          This offer’s per-requirement answers aren’t available: it isn’t among the listing’s active offers. The listing asks for:
          {wordingNote}
        </p>
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
      <p className="ui-text-sm ui-text-muted">
        {includedCount} of {answers.length} requirements included in this offer’s price.{wordingNote}
      </p>
      <RequirementAnswerList answers={answers} notePrefix="Bidder’s note" requirements={requirements} />
    </Stack>
  );
}
