/* The task's basics: title, category, area, price and its billing period, and how long offers stay open. For a REBID the
   price is what the business pays now (required); for new work it is an optional budget that stays hidden unless shown;
   for a piece it is the cut, which only the split ledger changes. An existing task keeps the billing period it was
   created in, since every cut and offer on it is in that period. */
import { categoryLabel } from '../../../../shared/format/categoryLabel';
import { Field, Grid, Input, Select } from '../../../../shared/ui';
import type { TaskDraftForm } from '../draft/draftTypes';
import { TASK_CATEGORIES } from '../draft/taskCategories';

export type TaskPricing = 'rebid' | 'budget' | 'cut';

interface TaskBasicsFieldsProps {
  form: TaskDraftForm;
  pricing: TaskPricing;
  isBillingPeriodLocked?: boolean;
  onChange: (patch: Partial<TaskDraftForm>) => void;
}

// Must stay in sync with TaskBillingPeriod in backend services/tasks/scope/types.py.
const PERIODS = [
  { value: 'annual', label: 'Per year' },
  { value: 'quarterly', label: 'Per quarter' },
  { value: 'bimonthly', label: 'Every two months' },
  { value: 'monthly', label: 'Per month' },
  { value: 'biweekly', label: 'Every two weeks' },
  { value: 'weekly', label: 'Per week' },
];

const PRICE_LABELS: Record<TaskPricing, { label: string; hint: string; placeholder: string }> = {
  rebid: { label: 'What you pay now ($)', hint: 'What you pay now, confirmed by you: the starting price offers are compared with', placeholder: 'e.g. 120,000' },
  budget: { label: 'Budget ($)', hint: 'Optional budget. Hidden on the public listing by default.', placeholder: 'Blank means no budget' },
  cut: { label: 'Cut ($)', hint: 'A piece’s price is its cut. It only changes through the split on the task it came from.', placeholder: '' },
};

/** Render the basic fields. */
export function TaskBasicsFields({ form, pricing, isBillingPeriodLocked = false, onChange }: TaskBasicsFieldsProps): JSX.Element {
  const price = PRICE_LABELS[pricing];
  // A saved task can hold a category or period this form doesn't offer (an older cleaning listing, say); show it as-is
  // rather than letting the select display a different option than the one that will be saved.
  const categories = TASK_CATEGORIES.some((category) => category.value === form.category)
    ? TASK_CATEGORIES
    : [...TASK_CATEGORIES, { value: form.category, label: categoryLabel(form.category) }];
  const periods = PERIODS.some((period) => period.value === form.billingPeriod) ? PERIODS : [...PERIODS, { value: form.billingPeriod, label: form.billingPeriod }];

  return (
    <Grid minItemWidth="14rem">
      <Field hint="Bidders see this as the listing’s title" label="Title">
        <Input onChange={(event) => onChange({ title: event.target.value })} placeholder="e.g. DevSecOps Engineering Support" value={form.title} />
      </Field>
      <Field hint="The DevSecOps template adds mission, environments and frameworks" label="Category">
        <Select onChange={(event) => onChange({ category: event.target.value })} value={form.category}>
          {categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
        </Select>
      </Field>
      <Field hint="Approximate; never a street address" label="Where the work is">
        <Input onChange={(event) => onChange({ serviceArea: event.target.value })} placeholder="e.g. Northern Virginia" value={form.serviceArea} />
      </Field>
      <Field hint={price.hint} label={price.label}>
        <Input
          disabled={pricing === 'cut'}
          inputMode="decimal"
          onChange={(event) => onChange({ price: event.target.value })}
          placeholder={price.placeholder}
          value={form.price}
        />
      </Field>
      <Field hint={isBillingPeriodLocked ? 'Fixed for an existing task: its cuts and offers use this period' : 'Every cut and piece uses this same period'} label="Billing period">
        <Select disabled={isBillingPeriodLocked} onChange={(event) => onChange({ billingPeriod: event.target.value })} value={form.billingPeriod}>
          {periods.map((period) => <option key={period.value} value={period.value}>{period.label}</option>)}
        </Select>
      </Field>
      <Field hint="Blank means no deadline" label="Days until offers close">
        <Input inputMode="numeric" onChange={(event) => onChange({ deadlineDays: event.target.value })} value={form.deadlineDays} />
      </Field>
    </Grid>
  );
}
