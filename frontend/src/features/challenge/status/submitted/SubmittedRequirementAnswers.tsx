/* The per-requirement answers a stored offer gave, as the server returned them, under a heading with an included count.
   The rows themselves are the shared RequirementAnswerList, matched to the public listing's requirement rows by key. */
import { useId } from 'react';

import { RequirementAnswerList } from '../../../../shared/offers/RequirementAnswerList';
import type { PublicRequirement } from '../../../publish/types';
import type { RequirementResponsePayload } from '../../types';
import './SubmittedOffer.css';

interface SubmittedRequirementAnswersProps {
  // The stored version's answers, one per requirement of the scope it answered.
  responses: RequirementResponsePayload[];
  // The listing's requirement rows, for their text and priority.
  requirements: PublicRequirement[];
}

/** Render the heading, an included count, and one row per stored answer. */
export function SubmittedRequirementAnswers({ responses, requirements }: SubmittedRequirementAnswersProps): JSX.Element {
  const headingId = useId();
  const includedCount = responses.filter((response) => response.is_included).length;

  return (
    <section aria-labelledby={headingId} className="submitted-offer__answers">
      <h3 className="submitted-offer__heading" id={headingId}>What your price includes</h3>
      <p className="ui-text-sm ui-text-muted">{includedCount} of {responses.length} requirements included</p>
      <RequirementAnswerList answers={responses} notePrefix="Your note" requirements={requirements} />
    </section>
  );
}
