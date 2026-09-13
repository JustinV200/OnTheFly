/* The task's basics: title, category, area, price and its billing period, and how long offers stay open. For a REBID the
   price is what the business pays now (required); for new work it is an optional budget that stays hidden unless shown. */
import { Field, Grid, Input, Select } from '../../../../shared/ui';
import type { TaskDraftForm } from '../draft/draftTypes';

interface TaskBasicsFieldsProps {
  form: TaskDraftForm;
  isRebid: boolean;
  onChange: (patch: Partial<TaskDraftForm>) => void;
}

// Must stay in sync with TaskBillingPeriod in backend services/tasks/scope/types.py.
const PERIODS = [
  { value: 'annual', label: 'Per year' },
  { value: 'quarterly', label: 'Per quarter' },
  { value: 'monthly', label: 'Per month' },
  { value: 'weekly', label: 'Per week' },
];

/** Render the basic fields. */
export function TaskBasicsFields({ form, isRebid, onChange }: TaskBasicsFieldsProps): JSX.Element {
  return (
    <Grid minItemWidth="14rem">
      <Field hint="Bidders see this as the listing’s title" label="Title">
        <Input onChange={(event) => onChange({ title: event.target.value })} placeholder="e.g. DevSecOps Engineering Support" value={form.title} />
      </Field>
      <Field hint="The DevSecOps template adds mission, environments and frameworks" label="Category">
        <Select onChange={(event) => onChange({ category: event.target.value })} value={form.category}>
          <option value="devsecops">DevSecOps</option>
          <option value="professional_services">Professional services</option>
          <option value="facilities">Facilities</option>
        </Select>
      </Field>
      <Field hint="Approximate; never a street address" label="Where the work is">
        <Input onChange={(event) => onChange({ serviceArea: event.target.value })} placeholder="e.g. Northern Virginia" value={form.serviceArea} />
      </Field>
      <Field
        hint={isRebid ? 'What you pay now, confirmed by you: the starting price offers are compared with' : 'Optional budget. Hidden on the public listing by default.'}
        label={isRebid ? 'What you pay now ($)' : 'Budget ($)'}
      >
        <Input inputMode="decimal" onChange={(event) => onChange({ price: event.target.value })} placeholder={isRebid ? 'e.g. 1,416,000' : 'Blank means no budget'} value={form.price} />
      </Field>
      <Field hint="Every cut and piece uses this same period" label="Billing period">
        <Select onChange={(event) => onChange({ billingPeriod: event.target.value })} value={form.billingPeriod}>
          {PERIODS.map((period) => <option key={period.value} value={period.value}>{period.label}</option>)}
        </Select>
      </Field>
      <Field hint="Blank means no deadline" label="Days until offers close">
        <Input inputMode="numeric" onChange={(event) => onChange({ deadlineDays: event.target.value })} value={form.deadlineDays} />
      </Field>
    </Grid>
  );
}
