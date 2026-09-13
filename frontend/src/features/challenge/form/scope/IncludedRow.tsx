/* One requested term (supplies, equipment, taxes) as a row: what the owner asked for beside the challenger's answer,
   Included / Not included / Not stated. On an offer, null already means "not stated" to the server, so that segment is
   selected rather than leaving the row blank: the control always shows exactly what would be submitted. */
import { SegmentedControl, SegmentedOption } from '../../../../shared/ui';
import './IncludedRow.css';

type IncludedAnswer = 'included' | 'not_included' | 'not_stated';

const OPTIONS: SegmentedOption<IncludedAnswer>[] = [
  { value: 'included', label: 'Included' },
  { value: 'not_included', label: 'Not included' },
  { value: 'not_stated', label: 'Not stated' },
];

interface IncludedRowProps {
  term: string;
  // The listing's own expectation for this term; null when the owner didn't state one.
  requested: boolean | null;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
}

/** Render the term, the owner's request in words, and the three-way answer. */
export function IncludedRow({ term, requested, value, onChange }: IncludedRowProps): JSX.Element {
  return (
    <div className="bid-included">
      <div className="bid-included__text">
        <span className="bid-included__term">{term}</span>
        <span className="bid-included__requested">Requested: {describe(requested)}</span>
      </div>
      <SegmentedControl
        label={`${term} in your price`}
        onChange={(answer) => onChange(answer === 'not_stated' ? null : answer === 'included')}
        options={OPTIONS}
        size="sm"
        value={value === null ? 'not_stated' : value ? 'included' : 'not_included'}
      />
    </div>
  );
}

function describe(value: boolean | null): string {
  if (value === null) {
    return 'not stated';
  }
  return value ? 'included' : 'not included';
}
