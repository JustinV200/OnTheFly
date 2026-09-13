/* Constraints every bidder must meet: clearance, location, insurance, set-aside. Pieces split off this task inherit them by
   default, so they are worth stating up front. */
import { Button, Icon, Input, Select, Stack } from '../../../../shared/ui';
import { ConstraintDraft, newRowId } from '../draft/draftTypes';
import './TaskFields.css';

interface ConstraintsEditorProps {
  rows: ConstraintDraft[];
  onChange: (rows: ConstraintDraft[]) => void;
}

const KINDS: Array<{ value: ConstraintDraft['kind']; label: string }> = [
  { value: 'clearance', label: 'Clearance' },
  { value: 'location', label: 'Location' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'set_aside', label: 'Set-aside' },
];

/** Render one row per constraint and an add button. */
export function ConstraintsEditor({ rows, onChange }: ConstraintsEditorProps): JSX.Element {
  const update = (rowId: string, patch: Partial<ConstraintDraft>): void => onChange(rows.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)));

  return (
    <Stack gap={2}>
      {rows.length === 0 ? <p className="ui-text-sm ui-text-muted">No constraints. Bidders won’t be told to meet any.</p> : null}
      {rows.map((row) => (
        <div className="task-fields__constraint" key={row.rowId}>
          <Select aria-label="Constraint kind" onChange={(event) => update(row.rowId, { kind: event.target.value as ConstraintDraft['kind'] })} value={row.kind}>
            {KINDS.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
          </Select>
          <Input aria-label="Constraint value" onChange={(event) => update(row.rowId, { value: event.target.value })} placeholder="e.g. Secret" value={row.value} />
          <Button aria-label="Remove constraint" iconStart={<Icon name="x" />} onClick={() => onChange(rows.filter((item) => item.rowId !== row.rowId))} size="sm" variant="ghost">
            Remove
          </Button>
        </div>
      ))}
      <div>
        <Button iconStart={<Icon name="plus" />} onClick={() => onChange([...rows, { rowId: newRowId(), kind: 'clearance', value: '' }])} size="sm">
          Add constraint
        </Button>
      </div>
    </Stack>
  );
}
