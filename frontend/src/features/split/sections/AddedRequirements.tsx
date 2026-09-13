/* Requirements the owner adds for the piece alone: work the piece needs that isn't a row on the task, or the whole
   scope of a piece split off a task that has no requirement rows. Typed by hand or drafted with AI from a description,
   they go only to the piece; the task's own scope never gains or loses them. Tags and hours work as on the task form,
   so the piece's owner can price it in Ways to save. */
import { Callout } from '../../../shared/ui';
import { AiRequirementDraft } from '../../tasks/new/aiDraft/AiRequirementDraft';
import { withDraftedRows } from '../../tasks/new/aiDraft/draftRowsFromResult';
import type { RequirementDraft } from '../../tasks/new/draft/draftTypes';
import { RequirementRowsEditor } from '../../tasks/new/fields/RequirementRowsEditor';
import type { TaskDetail } from '../../tasks/types';

interface AddedRequirementsProps {
  task: TaskDetail;
  rows: RequirementDraft[];
  // True when the drawer opened from a suggested card, whose pricing covers only the card's requirements.
  isSuggestion: boolean;
  onChange: (rows: RequirementDraft[]) => void;
}

/** Render the added-requirement rows, the AI draft panel and the add control. */
export function AddedRequirements({ task, rows, isSuggestion, onChange }: AddedRequirementsProps): JSX.Element {
  const typedTexts = rows.map((row) => row.text.trim()).filter(Boolean);
  const hasRowsToPick = task.requirements.some((requirement) => requirement.piece === null);

  return (
    <fieldset className="split-drawer__fieldset">
      <legend className="split-drawer__legend">Requirements you add for this piece</legend>
      <p className="ui-text-muted ui-text-sm">
        Anything the piece needs that isn’t a row on this task. These go only to the piece; this task’s scope doesn’t change.
      </p>
      {isSuggestion && rows.length > 0 ? (
        <Callout role="note" title="This becomes a manual split" tone="info">
          <p>The suggestion was priced on the card’s requirements only, so a piece with added requirements is split off manually.</p>
        </Callout>
      ) : null}
      <AiRequirementDraft
        context={{
          category: task.category,
          billingPeriod: task.billing_period,
          serviceArea: null,
          purpose: 'piece',
          // The task's own rows too, so the draft doesn't restate work the owner could simply pick above.
          existingRequirements: [...task.requirements.map((requirement) => requirement.text), ...typedTexts],
        }}
        isDefaultOpen={!hasRowsToPick}
        onDrafted={(drafted) => onChange(withDraftedRows(rows, drafted))}
      />
      <RequirementRowsEditor addLabel="Add a requirement for the piece" billingPeriod={task.billing_period} minRows={0} onChange={onChange} rows={rows} />
    </fieldset>
  );
}
