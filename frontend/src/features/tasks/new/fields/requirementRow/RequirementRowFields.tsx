/* One requirement row opened for editing: what the work is, priority, labor category and hours up front, PSC and NAICS
   behind a disclosure (codes most owners copy from a contract, not type from memory), and the "confirmed" switches.
   Only confirmed tags form Ways to save segments; unconfirmed hours stay an estimate and blank hours stay unanswered. */
import { useState } from 'react';

import { perPeriodWords } from '../../../../../shared/market';
import { Badge, Button, Checkbox, Disclosure, Field, Grid, Icon, Input, Select, Stack } from '../../../../../shared/ui';
import type { RequirementDraft } from '../../draft/draftTypes';

interface RequirementRowFieldsProps {
  row: RequirementDraft;
  index: number;
  billingPeriod: string;
  canRemove: boolean;
  onChange: (patch: Partial<RequirementDraft>) => void;
  onDone: () => void;
  onRemove: () => void;
}

/** Render the editable fieldset for one row. */
export function RequirementRowFields({ row, index, billingPeriod, canRemove, onChange, onDone, onRemove }: RequirementRowFieldsProps): JSX.Element {
  // Decided once when the row opens: a native <details> re-closes if its open prop flips while the owner types a code.
  const [isCodesOpen] = useState(() => row.laborCategory.trim() !== '' && (row.psc.trim() === '' || row.naics.trim() === ''));
  const codes = [row.psc.trim(), row.naics.trim()].filter(Boolean).join(' · ');

  return (
    <fieldset className="task-fields__requirement">
      <legend className="task-fields__legend">
        Requirement {index + 1}
        {/* The row's origin stays visible after edits: the model wrote it, even once the owner confirms its tags. */}
        {row.source === 'llm-draft' ? <> <Badge tone="brand">AI draft</Badge></> : null}
      </legend>
      <Stack gap={3}>
        <Field label="What the work is">
          <Input onChange={(event) => onChange({ text: event.target.value })} placeholder="e.g. Prepare and maintain the ATO package" value={row.text} />
        </Field>
        <Grid minItemWidth="9rem">
          <Field label="Priority">
            <Select onChange={(event) => onChange({ priority: event.target.value === 'should' ? 'should' : 'must' })} value={row.priority}>
              <option value="must">Required</option>
              <option value="should">Nice to have</option>
            </Select>
          </Field>
          <Field label="Labor category">
            <Input onChange={(event) => onChange({ laborCategory: event.target.value })} placeholder="e.g. Security Compliance Analyst" value={row.laborCategory} />
          </Field>
          <Field hint={`Hours ${perPeriodWords(billingPeriod)}; blank is unanswered`} label="Hours">
            <Input inputMode="numeric" onChange={(event) => onChange({ hours: event.target.value })} value={row.hours} />
          </Field>
        </Grid>
        <Disclosure isDefaultOpen={isCodesOpen} summary={codes ? `PSC and NAICS codes: ${codes}` : 'PSC and NAICS codes (needed for Ways to save)'}>
          <Grid minItemWidth="9rem">
            <Field hint="e.g. DJ01" label="PSC">
              <Input onChange={(event) => onChange({ psc: event.target.value })} value={row.psc} />
            </Field>
            <Field hint="e.g. 541512" label="NAICS">
              <Input inputMode="numeric" onChange={(event) => onChange({ naics: event.target.value })} value={row.naics} />
            </Field>
          </Grid>
        </Disclosure>
        <div className="task-fields__switches">
          <Checkbox checked={row.isTagsConfirmed} label="Tags confirmed" onChange={(event) => onChange({ isTagsConfirmed: event.target.checked })} />
          <Checkbox checked={row.isHoursConfirmed} disabled={row.hours.trim() === ''} label="Hours confirmed" onChange={(event) => onChange({ isHoursConfirmed: event.target.checked })} />
          <Button disabled={row.text.trim() === ''} onClick={onDone} size="sm">Done</Button>
          {canRemove ? (
            <Button iconStart={<Icon name="x" />} onClick={onRemove} size="sm" variant="ghost">
              Remove
            </Button>
          ) : null}
        </div>
      </Stack>
    </fieldset>
  );
}
