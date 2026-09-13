/* A yes / no / not-stated select for scope terms.
   "Not stated" is real information, different from "no", so it's a choice rather than a blank (plan1.md §4). */
import { Field, Select } from '../ui';

interface TriStateSelectProps {
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  yesLabel?: string;
  noLabel?: string;
}

/** Render a labelled select mapping to true, false, or null. */
export function TriStateSelect({ label, value, onChange, yesLabel = 'Included', noLabel = 'Not included' }: TriStateSelectProps): JSX.Element {
  const current = value === null ? 'unstated' : value ? 'yes' : 'no';
  return (
    <Field label={label}>
      <Select
        onChange={(event) => onChange(event.target.value === 'unstated' ? null : event.target.value === 'yes')}
        value={current}
      >
        <option value="unstated">Not stated</option>
        <option value="yes">{yesLabel}</option>
        <option value="no">{noLabel}</option>
      </Select>
    </Field>
  );
}
