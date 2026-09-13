/* One offer's per-requirement answers as a list: each requirement's text and priority, Included or Not included, and any
   note. Shared by the bidder's submitted-offer confirmation and the poster's offer trace, so both word an answer alike.
   Texts come from the listing's requirement rows, matched by key; a key with no row is shown as its key, never dropped.
   Words carry each answer and the mark only echoes it, in one neutral colour: "Not included" isn't a failure. */
import { requirementPriorityLabel } from '../market';
import { Icon } from '../ui';
import './RequirementAnswerList.css';

// Structural, so the challenge and trace response shapes both fit without a feature import.
export interface RequirementAnswerItem {
  requirement_key: string;
  is_included: boolean;
  note: string | null;
}

export interface RequirementAnswerSource {
  key: string;
  text: string;
  priority: string;
}

interface RequirementAnswerListProps {
  answers: RequirementAnswerItem[];
  requirements: RequirementAnswerSource[];
  // Words before a note, e.g. "Your note" for the bidder or "Bidder's note" for the poster.
  notePrefix: string;
}

/** Render the answers in the order given, one row each. */
export function RequirementAnswerList({ answers, requirements, notePrefix }: RequirementAnswerListProps): JSX.Element {
  const requirementsByKey = new Map(requirements.map((requirement) => [requirement.key, requirement]));

  return (
    <ul className="requirement-answers">
      {answers.map((answer) => {
        const requirement = requirementsByKey.get(answer.requirement_key);
        return (
          <li className="requirement-answers__row" key={answer.requirement_key}>
            <div className="requirement-answers__text">
              <span className="requirement-answers__name">{requirement?.text ?? answer.requirement_key}</span>
              {requirement ? <span className="requirement-answers__meta">{requirementPriorityLabel(requirement.priority)}</span> : null}
              {answer.note ? <span className="requirement-answers__meta">{notePrefix}: {answer.note}</span> : null}
            </div>
            <span className="requirement-answers__value">
              <Icon name={answer.is_included ? 'check' : 'x'} size={14} />
              {answer.is_included ? 'Included' : 'Not included'}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
