/* The scope form's cards (basics, the DevSecOps template, requirement rows and constraints), shared by posting new work,
   a REBID, and editing a task's saved scope, so an owner adds requirements the same way everywhere: typed by hand, or
   drafted with AI from a description and then reviewed. */
import { Card, Stack } from '../../../../shared/ui';
import { AiRequirementDraft } from '../aiDraft/AiRequirementDraft';
import { withDraftedRows } from '../aiDraft/draftRowsFromResult';
import type { TaskDraftForm } from '../draft/draftTypes';
import { ConstraintsEditor } from './ConstraintsEditor';
import { DevSecOpsFields } from './DevSecOpsFields';
import { RequirementRowsEditor } from './RequirementRowsEditor';
import { TaskBasicsFields, TaskPricing } from './TaskBasicsFields';

interface TaskScopeFieldsProps {
  form: TaskDraftForm;
  pricing: TaskPricing;
  isBillingPeriodLocked?: boolean;
  onChange: (patch: Partial<TaskDraftForm>) => void;
}

/** Render the scope form's cards. */
export function TaskScopeFields({ form, pricing, isBillingPeriodLocked = false, onChange }: TaskScopeFieldsProps): JSX.Element {
  const typedRows = form.requirements.filter((row) => row.text.trim() !== '');
  // Open the AI panel where typing rows first is unlikely (a task with no rows yet), but never on a REBID: there the
  // owner is confirming work they already pay for, and an open panel would sit above the rows they came to fill in.
  const isAiDraftOpen = typedRows.length === 0 && pricing !== 'rebid';

  return (
    <>
      <Card title="Basics">
        <TaskBasicsFields form={form} isBillingPeriodLocked={isBillingPeriodLocked} onChange={onChange} pricing={pricing} />
      </Card>
      {form.category === 'devsecops' ? (
        <Card title="DevSecOps details">
          <DevSecOpsFields form={form} onChange={onChange} />
        </Card>
      ) : null}
      <Card description="One row per requirement. Offers answer each one, and Ways to save groups them by confirmed tags." title="Requirements">
        <Stack gap={4}>
          <AiRequirementDraft
            context={{
              category: form.category,
              billingPeriod: form.billingPeriod,
              serviceArea: form.serviceArea.trim() || null,
              purpose: pricing === 'cut' ? 'piece' : 'task',
              existingRequirements: typedRows.map((row) => row.text.trim()),
            }}
            isDefaultOpen={isAiDraftOpen}
            onDrafted={(drafted) => onChange({ requirements: withDraftedRows(form.requirements, drafted) })}
          />
          <RequirementRowsEditor billingPeriod={form.billingPeriod} onChange={(requirements) => onChange({ requirements })} rows={form.requirements} />
        </Stack>
      </Card>
      <Card description="Pieces split off this task inherit these by default." title="Constraints">
        <ConstraintsEditor onChange={(constraints) => onChange({ constraints })} rows={form.constraints} />
      </Card>
    </>
  );
}
