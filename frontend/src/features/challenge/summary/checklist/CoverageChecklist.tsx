/* The summary card's "Requested vs your offer" table: each requested term, what the owner asked for, and the form's
   answer with a check, a cross, or a dash. The words always carry the answer; the mark only echoes it. Free-text extras
   the form sends are echoed too, since the server reads them when it scores the offer. */
import { Icon } from '../../../../shared/ui';
import type { CoverageAnswer, CoverageRow } from './listCoverageRows';
import './CoverageChecklist.css';

interface CoverageChecklistProps {
  // Names the table for assistive technology; the visible heading sits above it.
  labelId: string;
  rows: CoverageRow[];
  otherInclusions: string;
  exclusions: string;
}

/** Render the checklist table and any typed inclusions or exclusions. */
export function CoverageChecklist({ labelId, rows, otherInclusions, exclusions }: CoverageChecklistProps): JSX.Element {
  return (
    <div className="bid-checklist">
      <table aria-labelledby={labelId} className="bid-checklist__table">
        <thead>
          <tr>
            <th scope="col">Term</th>
            <th scope="col">Asked</th>
            <th scope="col">You</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th className="bid-checklist__term" scope="row">{row.label}</th>
              <td className="bid-checklist__asked">{row.requested}</td>
              <td className={`bid-checklist__answer bid-checklist__answer--${row.answer}`}>
                <span className="bid-checklist__answer-text">
                  <Mark answer={row.answer} />
                  {row.answerText}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {otherInclusions.trim() ? <p className="bid-checklist__extra"><strong>Also included:</strong> {otherInclusions.trim()}</p> : null}
      {exclusions.trim() ? <p className="bid-checklist__extra"><strong>Excluded:</strong> {exclusions.trim()}</p> : null}
    </div>
  );
}

function Mark({ answer }: { answer: CoverageAnswer }): JSX.Element {
  if (answer === 'covered') {
    return <Icon className="bid-checklist__mark" name="check" size={13} />;
  }
  if (answer === 'not_covered') {
    return <Icon className="bid-checklist__mark" name="x" size={13} />;
  }
  return <span aria-hidden="true" className="bid-checklist__mark">–</span>;
}
