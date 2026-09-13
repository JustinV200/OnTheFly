/* Editing a task's saved scope at /tasks/:id/edit: the poster's current requirement rows, constraints and basics,
   prefilled, so requirements can be added or changed by hand without retyping the rest. Saving writes a new scope
   version (offers keep the version they answered) and nothing is published until the task page's exact preview. */
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useActingAccount } from '../../../shared/account/ActingAccountContext';
import { ApiError } from '../../../shared/api/client';
import { useApiQuery } from '../../../shared/api/useApiQuery';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { Badge, Button, ButtonLink, Callout, Card, PageHeader, SegmentedControl, Stack } from '../../../shared/ui';
import { UnpublishButton } from '../../publish/UnpublishButton';
import { buildTaskDraftPayload } from '../new/draft/buildTaskDraftPayload';
import { draftFromTemplate } from '../new/draft/draftFromTemplate';
import { emptyRequirement, TaskDraftForm, TaskScopeDraftPayload } from '../new/draft/draftTypes';
import { TaskScopeFields } from '../new/fields/TaskScopeFields';
import type { TaskDetail } from '../types';
import { editBlock } from './editBlock';
import { saveTaskScope } from './saveTaskScope';

/** Render the scope editor for the task's poster. */
export function EditTaskScopePage(): JSX.Element {
  const { id = '' } = useParams();
  const { account } = useActingAccount();
  const navigate = useNavigate();
  const taskQuery = useApiQuery<TaskDetail>(account ? `/api/tasks/${id}` : null);
  const task = taskQuery.data;
  const block = task ? editBlock(task) : null;
  // Only a poster may read the draft; anyone else is told why before a request that would be refused.
  const draftQuery = useApiQuery<TaskScopeDraftPayload>(task && block?.kind !== 'not_poster' && block?.kind !== 'accepted' ? `/api/tasks/${id}/scope-draft` : null);
  const [form, setForm] = useState<TaskDraftForm | null>(null);
  const [biddingMode, setBiddingMode] = useState<'sealed' | 'open'>('sealed');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fill the form once from the saved scope; later reloads (after unpublishing, say) never overwrite what was typed.
  useEffect(() => {
    if (draftQuery.data && form === null) {
      const draft = draftFromTemplate(draftQuery.data, { shouldKeepKeys: true });
      // A task with no rows yet (a listing backfilled into a REBID) opens with one empty row to type into.
      setForm({ ...draft, requirements: draft.requirements.length > 0 ? draft.requirements : [emptyRequirement()] });
    }
  }, [draftQuery.data, form]);
  useEffect(() => {
    if (task?.listing?.bidding_mode === 'open' || task?.listing?.bidding_mode === 'sealed') {
      setBiddingMode(task.listing.bidding_mode);
    }
  }, [task?.listing?.bidding_mode]);

  if (!account) {
    return (
      <EmptyState action={<ButtonLink to="/marketplace">Browse markets</ButtonLink>} title="Pick a business to edit its tasks">
        Choose one from the business switcher in the top bar, or browse the markets.
      </EmptyState>
    );
  }
  if (taskQuery.error?.status === 404) {
    return <EmptyState action={<ButtonLink to="/work">Go to My work</ButtonLink>} title="This task isn’t yours to see">Only a task’s poster and its current owner can open it.</EmptyState>;
  }
  if (!task) {
    return taskQuery.error ? <ErrorState error={taskQuery.error} onRetry={taskQuery.reload} title="Couldn’t load this task" /> : <LoadingSpinner label="Loading task…" />;
  }
  const back = <ButtonLink to={`/tasks/${task.id}`}>Back to the task</ButtonLink>;
  if (block?.kind === 'not_poster') {
    return (
      <EmptyState action={back} title="Only the poster edits this task’s scope">
        You own this task through an accepted offer, so its scope is the one your offer answered. To add requirements of your own, split off a piece and add them in the split drawer.
      </EmptyState>
    );
  }
  if (block?.kind === 'accepted') {
    return <EmptyState action={back} title="This task’s scope is fixed">You accepted an offer on it, so the accepted scope can’t change.</EmptyState>;
  }
  if (!form) {
    return draftQuery.error ? <ErrorState error={draftQuery.error} onRetry={draftQuery.reload} title="Couldn’t load the scope" /> : <LoadingSpinner label="Loading scope…" />;
  }

  const update = (patch: Partial<TaskDraftForm>): void => setForm((current) => (current ? { ...current, ...patch } : current));
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const result = buildTaskDraftPayload(form, task.origin === 'rebid');
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await saveTaskScope(task, result.payload, biddingMode);
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
        {/* The badge says "Private until you publish" in the same words as the new-task form, so the two never differ. */}
        <PageHeader
          actions={back}
          meta={<Badge tone="private">Private until you publish</Badge>}
          subtitle="Add, change or remove requirement rows by hand. Saving writes a new scope version; offers already received keep the version they answered."
          title={`Edit scope: ${task.title ?? 'untitled task'}`}
        />
        {block?.kind === 'unpublish_first' ? (
          <Callout actions={<UnpublishButton listingId={block.listingId} onUnpublished={taskQuery.reload} />} role="note" title="Unpublish before saving" tone="warning">
            <p>This listing is public. Unpublish it to change its scope; offers already received are kept.</p>
          </Callout>
        ) : task.listing?.visibility === 'public' ? (
          <Callout role="note" title="Saving takes this listing out of public view" tone="warning">
            <p>Its scope changes, so it goes back to review. Preview and republish it afterwards; offers already received are kept.</p>
          </Callout>
        ) : null}

        <TaskScopeFields form={form} isBillingPeriodLocked onChange={update} pricing={task.origin === 'rebid' ? 'rebid' : task.origin === 'split' ? 'cut' : 'budget'} />
        {task.origin === 'rebid' ? (
          <Card title="Bidding">
            <SegmentedControl label="Bidding mode" onChange={setBiddingMode} options={[{ value: 'sealed', label: 'Sealed (default)' }, { value: 'open', label: 'Open' }]} value={biddingMode} />
          </Card>
        ) : null}

        {error ? <Callout role="alert" title="Not saved" tone="danger"><p>{error}</p></Callout> : null}
        <div>
          <Button disabled={block?.kind === 'unpublish_first'} isBusy={isSaving} size="lg" type="submit" variant="primary">
            {isSaving ? 'Saving…' : 'Save scope (stays private)'}
          </Button>
        </div>
      </Stack>
    </form>
  );
}
