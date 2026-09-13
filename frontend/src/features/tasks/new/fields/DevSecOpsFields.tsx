/* The DevSecOps category template's own fields (backend services/scope/templates/devsecops.py). All optional; an unanswered
   field is left out of the payload rather than published empty. None of them flows into a piece split off later. */
import { Field, Grid, Input, Select, Textarea } from '../../../../shared/ui';
import type { TaskDraftForm } from '../draft/draftTypes';

interface DevSecOpsFieldsProps {
  form: TaskDraftForm;
  onChange: (patch: Partial<TaskDraftForm>) => void;
}

/** Render the template fields. */
export function DevSecOpsFields({ form, onChange }: DevSecOpsFieldsProps): JSX.Element {
  return (
    <Grid minItemWidth="14rem">
      <Field hint="Public. Don’t name your business or your current vendor." label="Mission">
        <Textarea onChange={(event) => onChange({ mission: event.target.value })} rows={2} value={form.mission} />
      </Field>
      <Field hint="Separate with commas" label="Environments">
        <Input onChange={(event) => onChange({ environments: event.target.value })} placeholder="e.g. AWS GovCloud (US), GitLab CI" value={form.environments} />
      </Field>
      <Field hint="Separate with commas" label="Compliance frameworks">
        <Input onChange={(event) => onChange({ frameworks: event.target.value })} placeholder="e.g. NIST SP 800-53 Rev. 5" value={form.frameworks} />
      </Field>
      <Field label="Period of performance (months)">
        <Input inputMode="numeric" onChange={(event) => onChange({ periodMonths: event.target.value })} value={form.periodMonths} />
      </Field>
      <Field label="Work model">
        <Select onChange={(event) => onChange({ workModel: event.target.value as TaskDraftForm['workModel'] })} value={form.workModel}>
          <option value="">Not stated</option>
          <option value="on_site">On site</option>
          <option value="hybrid">Hybrid</option>
          <option value="remote">Remote</option>
        </Select>
      </Field>
    </Grid>
  );
}
