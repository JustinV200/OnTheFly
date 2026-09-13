/* The summary card's coverage section, kept short so the submit button stays in view on a laptop: a count line of the
   bidder's answers, with the full "Requested vs your offer" table one click away. The table is the same one the card
   showed before; folding it hides nothing the form beside it doesn't already show row by row. */
import { Disclosure } from '../../../../shared/ui';
import type { PublicListingProjection } from '../../../publish/types';
import type { ChallengeFormFields } from '../../buildChallengePayload';
import { CoverageChecklist } from './CoverageChecklist';
import { describeCoverageCounts } from './describeCoverageCounts';
import { listCoverageRows } from './listCoverageRows';
import './CoverageSummary.css';

interface CoverageSummaryProps {
  // Prefix for the section's element ids, unique per form.
  idPrefix: string;
  listing: PublicListingProjection;
  fields: ChallengeFormFields;
}

/** Render the heading, the count line and the collapsible checklist. */
export function CoverageSummary({ idPrefix, listing, fields }: CoverageSummaryProps): JSX.Element {
  const rows = listCoverageRows(listing, fields);
  const headingId = `${idPrefix}-coverage`;

  return (
    <section aria-labelledby={headingId} className="bid-coverage-summary">
      <h3 className="bid-coverage-summary__heading" id={headingId}>What your offer includes</h3>
      <p className="bid-coverage-summary__counts">{describeCoverageCounts(rows)}</p>
      <Disclosure summary="Requested vs your offer">
        <CoverageChecklist exclusions={fields.exclusions} labelId={headingId} otherInclusions={fields.otherInclusions} rows={rows} />
      </Disclosure>
    </section>
  );
}
