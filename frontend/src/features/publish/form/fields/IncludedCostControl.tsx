/* One "is this included in the price?" question as a row: the question beside Included / Not included / Not stated.
   Nothing is chosen until the owner answers; "Not stated" is a deliberate answer and reads differently from unanswered. */
import { SegmentedControl, SegmentedOption } from '../../../../shared/ui';
import type { IncludedAnswer } from '../state/scopeFormValues';
import './IncludedCostControl.css';

const OPTIONS: SegmentedOption<IncludedAnswer>[] = [
  { value: 'included', label: 'Included' },
  { value: 'not_included', label: 'Not included' },
  { value: 'not_stated', label: 'Not stated' },
];

interface IncludedCostControlProps {
  // The wrapper's id, which the unanswered-questions list focuses.
  id: string;
  question: string;
  value: IncludedAnswer | null;
  onChange: (value: IncludedAnswer) => void;
}

/** Render the question, its answer state in words, and the segmented answer control. */
export function IncludedCostControl({ id, question, value, onChange }: IncludedCostControlProps): JSX.Element {
  return (
    <div className="publish-included" id={id}>
      <div className="publish-included__text">
        <span className="publish-included__question">{question}</span>
        {value === null ? <span className="publish-included__unanswered">Not answered yet</span> : null}
      </div>
      <SegmentedControl label={question} onChange={onChange} options={OPTIONS} size="sm" value={value} />
    </div>
  );
}
