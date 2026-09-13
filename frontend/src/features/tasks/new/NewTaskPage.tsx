/* Posting work as a task: /tasks/new for new work with no current vendor, /tasks/new?expense=<id> to REBID an expense with
   requirement rows. Both write a scope version the owner confirmed; nothing is public until the task page's exact preview
   is published. A demo shortcut fills the form from the server's example scope, for rehearsal, and is labeled as such.
   A REBID starts "What you pay now" from the expense's observed spend, which the owner can change before confirming. */
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useActingAccount } from '../../../shared/account/ActingAccountContext';
import { ApiError, get, post } from '../../../shared/api/client';
import { useApiQuery } from '../../../shared/api/useApiQuery';
import { EmptyState } from '../../../shared/components/EmptyState';
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { formatMinorForInput } from '../../../shared/format/formatMinorForInput';
import { cadenceSuffix } from '../../../shared/market';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Badge, Button, ButtonLink, Callout, Card, PageHeader, SegmentedControl, Stack } from '../../../shared/ui';
import type { ExpenseDetail } from '../../dashboard/types';
import type { TaskDetail } from '../types';
import { buildTaskDraftPayload } from './draft/buildTaskDraftPayload';
import { draftFromTemplate } from './draft/draftFromTemplate';
import { emptyTaskDraft, TaskDraftForm, TaskScopeDraftPayload } from './draft/draftTypes';
import { observedPriceForPeriod } from './draft/observedPriceForPeriod';
import { TaskScopeFields } from './fields/TaskScopeFields';

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
  // True while the price shown is the observed spend rather than something the owner typed or a template supplied.
  const [isPriceObserved, setIsPriceObserved] = useState(false);
  const hasOfferedObservedPrice = useRef(false);
  const isRebid = expenseId !== null;

  // Once the expense loads, start a blank price from its observed spend. Once only: a later refetch must never overwrite
  // a price the owner has since typed.
  useEffect(() => {
    if (!expense.data || hasOfferedObservedPrice.current) {
      return;
    }
    hasOfferedObservedPrice.current = true;
    const observed = observedPriceForPeriod(expense.data, form.billingPeriod);
    if (observed !== null && form.price.trim() === '') {
      setForm((current) => ({ ...current, price: formatMinorForInput(observed) }));
      setIsPriceObserved(true);
    }
  }, [expense.data, form.billingPeriod, form.price]);

  const update = (patch: Partial<TaskDraftForm>): void => {
    let next = patch;
    if (patch.price !== undefined) {
      setIsPriceObserved(false);
    } else if (patch.billingPeriod !== undefined && isPriceObserved && expense.data) {
      // An observed price follows the period, so a yearly figure never sits under "Per month". No period conversion:
      // a period the expense has no figure for clears the price for the owner to type.
      const observed = observedPriceForPeriod(expense.data, patch.billingPeriod);
      next = { ...patch, price: observed === null ? '' : formatMinorForInput(observed) };
      setIsPriceObserved(observed !== null);
    }
    setForm((current) => ({ ...current, ...next }));
  };

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
      // The template states its own price; it is no longer the observed figure, even when the amounts match.
      setIsPriceObserved(false);
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
              Observed <MoneyDisplay amountMinor={expense.data.amount_minor_per_period} currency={expense.data.currency} /> {cadenceSuffix(expense.data.cadence)},{' '}
              <MoneyDisplay amountMinor={expense.data.annualized_amount_minor} currency={expense.data.currency} /> a year.{' '}
              {expense.data.provenance.map((value) => <ProvenanceBadge key={value} kind="financial" value={value} />)}
            </p>
            {isPriceObserved ? (
              <p className="ui-text-sm ui-text-muted">“What you pay now” below starts from this observed spend. Change it if your contract price differs.</p>
            ) : null}
          </Card>
        ) : null}

        <Callout
          actions={(
            <Button onClick={() => void fillDemo()} variant="primary">
              {isRebid ? 'Fill with GovCon’s demo scope' : 'Fill with the example task'}
            </Button>
          )}
          role="note"
          title="Rehearsing the demo?"
          tone="simulated"
        >
          <p>One click fills every field from the demo scope. Review it before confirming: its hours and tags are illustrative demo figures.</p>
        </Callout>

        <TaskScopeFields form={form} onChange={update} pricing={isRebid ? 'rebid' : 'budget'} />
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
