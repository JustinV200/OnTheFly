/* Posting work as a task: /tasks/new for new work with no current vendor, /tasks/new?expense=<id> to REBID an expense with
   requirement rows. Both write a scope version the owner confirmed; nothing is public until the task page's exact preview
   is published. A demo shortcut fills the form from the server's example scope, for rehearsal, and is labeled as such. */
import { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useActingAccount } from '../../../shared/account/ActingAccountContext';
import { ApiError, get, post } from '../../../shared/api/client';
import { useApiQuery } from '../../../shared/api/useApiQuery';
import { EmptyState } from '../../../shared/components/EmptyState';
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Badge, Button, ButtonLink, Callout, Card, PageHeader, SegmentedControl, Stack } from '../../../shared/ui';
import type { ExpenseDetail } from '../../dashboard/types';
import type { TaskDetail } from '../types';
import { buildTaskDraftPayload } from './draft/buildTaskDraftPayload';
import { draftFromTemplate } from './draft/draftFromTemplate';
import { emptyTaskDraft, TaskDraftForm, TaskScopeDraftPayload } from './draft/draftTypes';
import { ConstraintsEditor } from './fields/ConstraintsEditor';
import { DevSecOpsFields } from './fields/DevSecOpsFields';
import { RequirementRowsEditor } from './fields/RequirementRowsEditor';
import { TaskBasicsFields } from './fields/TaskBasicsFields';

/** Render the new-task or REBID form for the acting business. */
export function NewTaskPage(): JSX.Element {
  const { account } = useActingAccount();
  const [searchParams] = useSearchParams();
  const expenseId = searchParams.get('expense');
  const navigate = useNavigate();
  const expense = useApiQuery<ExpenseDetail>(account && expenseId ? `/api/expenses/${expenseId}` : null);
  const [form, setForm] = useState<TaskDraftForm>(() => emptyTaskDraft());
  const [biddingMode, setBiddingMode] = useState<'sealed' | 'open'>('sealed');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isRebid = expenseId !== null;
  const update = (patch: Partial<TaskDraftForm>): void => setForm((current) => ({ ...current, ...patch }));

  if (!account) {
    return (
      <EmptyState action={<ButtonLink to="/marketplace">Browse markets</ButtonLink>} title="Pick a business to post work">
        Tasks are posted by a business. Choose one in the account menu.
      </EmptyState>
    );
  }

  const fillDemo = async (): Promise<void> => {
    setError(null);
    try {
      const template = await get<TaskScopeDraftPayload>(`/api/demo/task-chain/${isRebid ? 'rebid-template' : 'new-task-template'}`);
      setForm(draftFromTemplate(template));
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      setError(`Couldn’t load the demo scope: ${caught.message}`);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const result = buildTaskDraftPayload(form, isRebid);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const task = isRebid
        ? await post<TaskDetail>('/api/tasks/rebid', { expense_id: expenseId, draft: result.payload, choices: { bidding_mode: biddingMode } })
        : await post<TaskDetail>('/api/tasks', result.payload);
      navigate(`/tasks/${task.id}`);
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      setError(caught.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form noValidate onSubmit={(event) => void submit(event)}>
      <Stack gap={6}>
        <PageHeader
          meta={<Badge tone="private">Private until you publish</Badge>}
          subtitle={isRebid
            ? 'Scope what you already pay for as requirement rows, so bidders price the same work and Ways to save can find pieces.'
            : 'Post work with no current vendor. Scope it as requirement rows; a budget is optional and hidden by default.'}
          title={isRebid ? 'REBID with requirements' : 'Post new work'}
        />

        {isRebid && expense.data ? (
          <Card title={`Expense: ${expense.data.vendor}`} titleLevel={2}>
            <p className="ui-text-sm">
              Observed <MoneyDisplay amountMinor={expense.data.amount_minor_per_period} currency={expense.data.currency} /> per {expense.data.cadence} period,{' '}
              <MoneyDisplay amountMinor={expense.data.annualized_amount_minor} currency={expense.data.currency} /> a year.{' '}
              {expense.data.provenance.map((value) => <ProvenanceBadge key={value} kind="financial" value={value} />)}
            </p>
          </Card>
        ) : null}

        <Callout
          actions={<Button onClick={() => void fillDemo()} size="sm">{isRebid ? 'Fill with GovCon’s demo scope' : 'Fill with the example task'}</Button>}
          role="note"
          title="Rehearsing?"
          tone="simulated"
        >
          <p>Fill every field from the demo scope, then review it. Its hours and tags are illustrative demo figures.</p>
        </Callout>

        <Card title="Basics">
          <TaskBasicsFields form={form} isRebid={isRebid} onChange={update} />
        </Card>
        {form.category === 'devsecops' ? (
          <Card title="DevSecOps details">
            <DevSecOpsFields form={form} onChange={update} />
          </Card>
        ) : null}
        <Card description="One row per requirement. Offers answer each one, and Ways to save groups them by confirmed tags." title="Requirements">
          <RequirementRowsEditor billingPeriod={form.billingPeriod} onChange={(requirements) => update({ requirements })} rows={form.requirements} />
        </Card>
        <Card description="Pieces split off this task inherit these by default." title="Constraints">
          <ConstraintsEditor onChange={(constraints) => update({ constraints })} rows={form.constraints} />
        </Card>
        {isRebid ? (
          <Card title="Bidding">
            <SegmentedControl label="Bidding mode" onChange={setBiddingMode} options={[{ value: 'sealed', label: 'Sealed (default)' }, { value: 'open', label: 'Open' }]} value={biddingMode} />
          </Card>
        ) : null}

        {error ? <Callout role="alert" title="Not saved" tone="danger"><p>{error}</p></Callout> : null}
        <div>
          <Button isBusy={isSaving} size="lg" type="submit" variant="primary">
            {isSaving ? 'Saving…' : isRebid ? 'Confirm scope (stays private)' : 'Create the task (stays private)'}
          </Button>
        </div>
      </Stack>
    </form>
  );
}
