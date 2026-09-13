/* The split drawer (roadmap 12, step 6): pick requirements, set a cut, see the remainder, keep or drop inherited
   constraints, and split the piece off. Opened blank for a manual split, or prefilled from a Ways to save card. The piece
   starts private; the server checks every rule again (ownership, one active piece per requirement, the cut against the
   starting price), so what this shows live is guidance, never the authority. */
import { FormEvent, useEffect, useState } from 'react';

import { ApiError, post } from '../../shared/api/client';
import { formatMinorForInput } from '../../shared/format/formatMinorForInput';
import { parseDollarsToMinor } from '../../shared/format/parseDollarsToMinor';
import { Button, Callout, Drawer, Field, Input, Stack } from '../../shared/ui';
import type { TaskDetail } from '../tasks/types';
import { ConstraintFlowDown } from './ConstraintFlowDown';
import { CutSummary } from './CutSummary';
import { RequirementPicker } from './RequirementPicker';
import type { SplitPrefill } from './splitPrefill';
import './SplitDrawer.css';

interface SplitDrawerProps {
  task: TaskDetail;
  isOpen: boolean;
  onClose: () => void;
  // A Ways to save card's requirements and suggested cut; null for a manual split.
  prefill: SplitPrefill | null;
  onSplit: (childTaskId: string) => void;
}

interface SplitResponse {
  split_id: string;
  child_task_id: string;
}

/** Render the split drawer. */
export function SplitDrawer({ task, isOpen, onClose, prefill, onSplit }: SplitDrawerProps): JSX.Element | null {
  const [title, setTitle] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [cutText, setCutText] = useState('');
  const [removed, setRemoved] = useState<Array<{ kind: string; value: string }>>([]);
  const [isRemovalAcknowledged, setIsRemovalAcknowledged] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Each opening starts from the card (or blank), so a closed and reopened drawer never carries a stale draft.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setTitle(prefill?.title ?? '');
    setSelectedKeys(prefill?.requirementKeys ?? []);
    setCutText(prefill ? formatMinorForInput(prefill.cutMinor) : '');
    setRemoved([]);
    setIsRemovalAcknowledged(false);
    setError(null);
  }, [isOpen, prefill]);

  const cutMinor = cutText.trim() === '' ? null : parseDollarsToMinor(cutText);
  const isSuggested = prefill !== null && prefill.isSuggestion && sameKeys(prefill.requirementKeys, selectedKeys);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const problem = describeProblem(title, selectedKeys, cutMinor, removed.length > 0 && !isRemovalAcknowledged);
    if (problem) {
      setError(problem);
      return;
    }
    setIsWorking(true);
    setError(null);
    try {
      const response = await post<SplitResponse>(`/api/tasks/${task.id}/splits`, {
        title: title.trim(),
        requirement_keys: selectedKeys,
        cut_minor: cutMinor,
        currency: task.currency,
        billing_period: task.billing_period,
        entry_point: isSuggested ? 'suggested' : 'manual',
        savings_card_id: isSuggested ? prefill?.savingsCardId : null,
        removed_constraints: removed,
        is_constraint_removal_acknowledged: isRemovalAcknowledged,
      });
      onSplit(response.child_task_id);
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      setError(caught.message);
    } finally {
      setIsWorking(false);
    }
  };

  const formId = `split-form-${task.id}`;
  return (
    <Drawer
      description={prefill ? prefill.label : 'Split off requirements as their own task, priced as a cut of your starting price.'}
      footer={(
        <Button form={formId} isBusy={isWorking} size="lg" type="submit" variant="primary">
          {isWorking ? 'Splitting…' : 'Split off this piece'}
        </Button>
      )}
      isOpen={isOpen}
      onClose={onClose}
      title={prefill?.isSuggestion ? 'Split off a suggested piece' : 'Split off a piece'}
      width="lg"
    >
      <form className="split-drawer" id={formId} noValidate onSubmit={(event) => void submit(event)}>
        <Stack gap={5}>
          {task.relationship === 'poster_and_owner' ? (
            <Callout role="note" title="Your own listing changes too" tone="warning">
              <p>
                You haven’t accepted an offer yet, so splitting lowers your listing’s price by the cut and moves these
                requirements to the piece. Your listing goes back to review; preview and republish it afterwards.
              </p>
            </Callout>
          ) : null}
          <Field hint="Bidders see this as the piece’s title. It never names your client or this task." label="Piece title">
            <Input onChange={(event) => setTitle(event.target.value)} placeholder="e.g. ATO package and continuous monitoring" value={title} />
          </Field>
          <RequirementPicker onChange={setSelectedKeys} selectedKeys={selectedKeys} task={task} />
          <Field
            hint={prefill?.cutRangeText ?? `Per ${task.billing_period} period, in ${task.currency}. The piece is listed at this cut; its price stays hidden unless you choose to show it.`}
            label="Cut"
          >
            <Input inputMode="decimal" onChange={(event) => setCutText(event.target.value)} placeholder="e.g. 224,640" value={cutText} />
          </Field>
          <CutSummary cutMinor={cutMinor} task={task} />
          <ConstraintFlowDown
            constraints={task.constraints}
            isAcknowledged={isRemovalAcknowledged}
            onAcknowledge={setIsRemovalAcknowledged}
            onChange={setRemoved}
            removed={removed}
          />
          {error ? <Callout role="alert" title="Not split" tone="danger"><p>{error}</p></Callout> : null}
        </Stack>
      </form>
    </Drawer>
  );
}

function sameKeys(first: string[], second: string[]): boolean {
  return first.length === second.length && first.every((key) => second.includes(key));
}

function describeProblem(title: string, keys: string[], cutMinor: number | null, needsAcknowledgement: boolean): string | null {
  if (!title.trim()) {
    return 'Give the piece a title.';
  }
  if (keys.length === 0) {
    return 'Pick at least one requirement for the piece.';
  }
  if (cutMinor === null || cutMinor === 0) {
    return 'Enter a cut above $0, for example 224,640.';
  }
  if (needsAcknowledgement) {
    return 'Confirm that bidders on the piece won’t be told to meet the constraints you removed.';
  }
  return null;
}
