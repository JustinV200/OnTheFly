/* Checkboxes for the requirements still with the task. A requirement already in a piece isn't offered: each one stays
   with the task or goes to exactly one active piece. With nothing to pick, it says why, and the owner adds the piece's
   own requirements below instead. */
import { Checkbox } from '../../../shared/ui';
import type { TaskDetail } from '../../tasks/types';

interface RequirementPickerProps {
  task: TaskDetail;
  selectedKeys: string[];
  onChange: (keys: string[]) => void;
}

/** Render the requirement checklist. */
export function RequirementPicker({ task, selectedKeys, onChange }: RequirementPickerProps): JSX.Element {
  const available = task.requirements.filter((requirement) => requirement.piece === null);
  const toggle = (key: string, isChecked: boolean): void => {
    onChange(isChecked ? [...selectedKeys, key] : selectedKeys.filter((selected) => selected !== key));
  };

  return (
    <fieldset className="split-drawer__fieldset">
      <legend className="split-drawer__legend">Requirements that move to the piece</legend>
      {available.length === 0 ? (
        <p className="ui-text-muted ui-text-sm">
          {task.requirements.length === 0
            ? 'This task has no requirement rows to move. Add the piece’s requirements below.'
            : 'Every requirement on this task already went to a piece. Add the piece’s requirements below.'}
        </p>
      ) : (
        available.map((requirement) => (
          <Checkbox
            checked={selectedKeys.includes(requirement.key)}
            hint={[
              requirement.labor_category ?? 'No labor category',
              requirement.hours_estimate === null ? 'hours unanswered' : `${requirement.hours_estimate.toLocaleString('en-US')} h`,
            ].join(' · ')}
            key={requirement.key}
            label={requirement.text}
            onChange={(event) => toggle(requirement.key, event.target.checked)}
          />
        ))
      )}
    </fieldset>
  );
}
