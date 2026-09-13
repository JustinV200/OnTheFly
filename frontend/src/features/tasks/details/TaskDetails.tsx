/* The Details tab: the reference material behind a task, stacked rather than split across tabs. Requirements and
   constraints (the requirements component, rendered as-is), then the audit trail (the proof that ownership moved, kept
   above the fold of this tab), then the owner's own cost basis rates. */
import { Stack } from '../../../shared/ui';
import { RatesPanel } from '../../rates/RatesPanel';
import { TaskActivity } from '../activity/TaskActivity';
import { TaskRequirements } from '../requirements/TaskRequirements';
import type { TaskDetail } from '../types';

interface TaskDetailsProps {
  task: TaskDetail;
  onChanged: () => void;
}

/** Render requirements, rates (owner only) and activity. */
export function TaskDetails({ task, onChanged }: TaskDetailsProps): JSX.Element {
  return (
    <Stack gap={6}>
      <TaskRequirements task={task} />
      <TaskActivity events={task.events} />
      {task.is_owned_by_you ? (
        <RatesPanel
          currency={task.currency}
          kind={task.relationship === 'owner' ? 'internal_cost' : 'current_contract_rate'}
          laborCategories={retainedCategories(task)}
          onChanged={onChanged}
          taskId={task.id}
        />
      ) : null}
    </Stack>
  );
}

// Keep cost only prices requirements still with the task, so only their labor categories need a rate.
function retainedCategories(task: TaskDetail): string[] {
  const categories = task.requirements
    .filter((row) => row.piece === null)
    .map((row) => row.labor_category)
    .filter((value): value is string => Boolean(value));
  return Array.from(new Set(categories));
}
