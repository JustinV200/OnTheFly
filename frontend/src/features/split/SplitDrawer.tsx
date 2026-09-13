/* The split drawer (roadmap 12, step 6): pick requirements, add the piece's own, set a cut, see the remainder, keep or
   drop inherited constraints, and split the piece off. Opened blank for a manual split, or prefilled from a Ways to save
   card. The piece starts private; the server checks every rule again (ownership, one active piece per requirement, the
   cut against the starting price), so what this shows live is guidance, never the authority. */
import { FormEvent, useEffect, useRef, useState } from 'react';

import { ApiError, post } from '../../shared/api/client';
import { formatMinorForInput } from '../../shared/format/formatMinorForInput';
import { parseDollarsToMinor } from '../../shared/format/parseDollarsToMinor';
import { Badge, Button, Callout, Drawer, Field, Input, Stack } from '../../shared/ui';
import { buildRequirementRows } from '../tasks/new/draft/buildRequirementRows';
import { emptyRequirement, RequirementDraft } from '../tasks/new/draft/draftTypes';
import type { TaskDetail } from '../tasks/types';
import { AddedRequirements } from './sections/AddedRequirements';
import { ConstraintFlowDown } from './sections/ConstraintFlowDown';
import { CutSummary } from './sections/CutSummary';
import { RequirementPicker } from './sections/RequirementPicker';
import type { SplitPrefill } from './splitPrefill';
import { splitProblem } from './splitProblem';
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
  const [addedRows, setAddedRows] = useState<RequirementDraft[]>([]);
  const [cutText, setCutText] = useState('');
  const [removed, setRemoved] = useState<Array<{ kind: string; value: string }>>([]);
  const [isRemovalAcknowledged, setIsRemovalAcknowledged] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const hasRowsToPick = task.requirements.some((requirement) => requirement.piece === null);

  // Each opening starts from the card (or blank), so a closed and reopened drawer never carries a stale draft. With no
  // rows left to pick, a manual split opens with one empty row to type into, since added rows are the only way in.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setTitle(prefill?.title ?? '');
    setSelectedKeys(prefill?.requirementKeys ?? []);
    setAddedRows(prefill === null && !hasRowsToPick ? [emptyRequirement()] : []);
    setCutText(prefill ? formatMinorForInput(prefill.cutMinor) : '');
    setRemoved([]);
    setIsRemovalAcknowledged(false);
    setError(null);
  }, [isOpen, prefill, hasRowsToPick]);

  // The error sits at the end of a long, scrolling drawer; bring it into view so a refused split never looks like a
  // button that did nothing.
  useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }, [error]);

  const cutMinor = cutText.trim() === '' ? null : parseDollarsToMinor(cutText);
  const added = buildRequirementRows(addedRows);
  const addedCount = 'rows' in added ? added.rows.length : 0;
  // A suggestion is priced on exactly its card's requirements, so picking differently or adding a row makes it manual.
  const isSuggested = prefill !== null && prefill.isSuggestion && sameKeys(prefill.requirementKeys, selectedKeys) && addedCount === 0;

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const problem = 'error' in added ? added.error : splitProblem({
      title,
      pickedKeyCount: selectedKeys.length,
      addedRowCount: addedCount,
      cutMinor,
      needsRemovalAcknowledgement: removed.length > 0 && !isRemovalAcknowledged,
    });
    if (problem || !('rows' in added)) {
      setError(problem);
      return;
    }
    setIsWorking(true);
    setError(null);
    try {
      const response = await post<SplitResponse>(`/api/tasks/${task.id}/splits`, {
        title: title.trim(),
        requirement_keys: selectedKeys,
        new_requirements: added.rows,
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
      // The description says what this piece is worth on the market; the card's honesty label sits by the Cut input, on
      // the figure it qualifies, rather than heading the whole drawer.
      description={prefill?.cutRangeText ?? 'Split off requirements as their own task, priced as a cut of your starting price.'}
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
                You haven’t accepted an offer yet, so splitting lowers your listing’s price by the cut and moves any
                requirements you pick to the piece. Your listing goes back to review; preview and republish it afterwards.
              </p>
            </Callout>
          ) : null}
          <Field hint="Bidders see this as the piece’s title. It never names your client or this task." label="Piece title">
            <Input onChange={(event) => setTitle(event.target.value)} placeholder="e.g. ATO package and continuous monitoring" value={title} />
          </Field>
          <RequirementPicker onChange={setSelectedKeys} selectedKeys={selectedKeys} task={task} />
          <AddedRequirements isSuggestion={prefill?.isSuggestion ?? false} onChange={setAddedRows} rows={addedRows} task={task} />
          <Stack gap={2}>
            <Field
              hint={`Per ${task.billing_period} period, in ${task.currency}. The piece is listed at this cut; its price stays hidden unless you choose to show it.`}
              label="Cut"
            >
              <Input inputMode="decimal" onChange={(event) => setCutText(event.target.value)} placeholder="e.g. 224,640" value={cutText} />
            </Field>
            {/* The prefilled figure is modeled, so its label stays on screen right beside it. Simulated tone is the
                design system's mark for demo data; public evidence keeps a plain muted line. */}
            {prefill ? (
              prefill.isLabelDemoData
                ? <div><Badge tone="simulated">{prefill.label}</Badge></div>
                : <p className="ui-text-xs ui-text-muted">{prefill.label}</p>
            ) : null}
          </Stack>
          <CutSummary cutMinor={cutMinor} task={task} />
          <ConstraintFlowDown
            constraints={task.constraints}
            isAcknowledged={isRemovalAcknowledged}
            onAcknowledge={setIsRemovalAcknowledged}
            onChange={setRemoved}
            removed={removed}
          />
          {error ? <div ref={errorRef}><Callout role="alert" title="Not split" tone="danger"><p>{error}</p></Callout></div> : null}
        </Stack>
      </form>
    </Drawer>
  );
}

function sameKeys(first: string[], second: string[]): boolean {
  return first.length === second.length && first.every((key) => second.includes(key));
}
