/* Requirement rows: what the work is, must or nice to have, its labor category, PSC and NAICS tags, and hours per billing
   period, each with "confirmed" switches. Only confirmed tags form Ways to save segments; unconfirmed hours stay an estimate
   and blank hours stay unanswered (plan2, "Model and code boundaries"). */
import { Button, Checkbox, Field, Grid, Icon, Input, Select, Stack } from '../../../../shared/ui';
import { emptyRequirement, RequirementDraft } from '../draft/draftTypes';
import './TaskFields.css';

interface RequirementRowsEditorProps {
  rows: RequirementDraft[];
  billingPeriod: string;
  onChange: (rows: RequirementDraft[]) => void;
}

/** Render one editable card per requirement, and add/remove controls. */
export function RequirementRowsEditor({ rows, billingPeriod, onChange }: RequirementRowsEditorProps): JSX.Element {
  const update = (rowId: string, patch: Partial<RequirementDraft>): void => {
    onChange(rows.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)));
  };

  return (
    <Stack gap={3}>
      {rows.map((row, index) => (
        <fieldset className="task-fields__requirement" key={row.rowId}>
          <legend className="task-fields__legend">Requirement {index + 1}</legend>
          <Stack gap={3}>
            <Field label="What the work is">
              <Input onChange={(event) => update(row.rowId, { text: event.target.value })} placeholder="e.g. Prepare and maintain the ATO package" value={row.text} />
            </Field>
            <Grid minItemWidth="9rem">
              <Field label="Priority">
                <Select onChange={(event) => update(row.rowId, { priority: event.target.value === 'should' ? 'should' : 'must' })} value={row.priority}>
                  <option value="must">Must</option>
                  <option value="should">Nice to have</option>
                </Select>
              </Field>
              <Field label="Labor category">
                <Input onChange={(event) => update(row.rowId, { laborCategory: event.target.value })} placeholder="e.g. Security Compliance Analyst" value={row.laborCategory} />
              </Field>
              <Field hint="e.g. DJ01" label="PSC">
                <Input onChange={(event) => update(row.rowId, { psc: event.target.value })} value={row.psc} />
              </Field>
              <Field hint="e.g. 541512" label="NAICS">
                <Input inputMode="numeric" onChange={(event) => update(row.rowId, { naics: event.target.value })} value={row.naics} />
              </Field>
              <Field hint={`Per ${billingPeriod} period; blank is unanswered`} label="Hours">
                <Input inputMode="numeric" onChange={(event) => update(row.rowId, { hours: event.target.value })} value={row.hours} />
              </Field>
            </Grid>
            <div className="task-fields__switches">
              <Checkbox checked={row.isTagsConfirmed} label="Tags confirmed" onChange={(event) => update(row.rowId, { isTagsConfirmed: event.target.checked })} />
              <Checkbox checked={row.isHoursConfirmed} disabled={row.hours.trim() === ''} label="Hours confirmed" onChange={(event) => update(row.rowId, { isHoursConfirmed: event.target.checked })} />
              {rows.length > 1 ? (
                <Button iconStart={<Icon name="x" />} onClick={() => onChange(rows.filter((item) => item.rowId !== row.rowId))} size="sm" variant="ghost">
                  Remove
                </Button>
              ) : null}
            </div>
          </Stack>
        </fieldset>
      ))}
      <div>
        <Button iconStart={<Icon name="plus" />} onClick={() => onChange([...rows, emptyRequirement()])} size="sm">Add requirement</Button>
      </div>
    </Stack>
  );
}
