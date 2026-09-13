/* The Overview tab, the task's story in one place: the viewer's money view, then the pieces it split off with each
   one's status and next action. A client after acceptance with no pieces of its own sees only its money: the pieces its
   task owner splits off are never sent to it. */
import { Stack } from '../../../shared/ui';
import { BuyerMoney } from '../money/BuyerMoney';
import { OwnerMoney } from '../money/OwnerMoney';
import { TaskPieces } from '../pieces/TaskPieces';
import type { TaskDetail } from '../types';

interface TaskOverviewProps {
  task: TaskDetail;
  onChanged: () => void;
  onSplit: () => void;
  highlightedPieceId: string | null;
}

/** Render the money view and the pieces list. */
export function TaskOverview({ task, onChanged, onSplit, highlightedPieceId }: TaskOverviewProps): JSX.Element {
  const isClientWithoutPieces = task.relationship === 'poster' && task.pieces.length === 0;
  return (
    <Stack gap={6}>
      {task.owner_money ? <OwnerMoney money={task.owner_money} /> : task.buyer_money ? <BuyerMoney money={task.buyer_money} /> : null}
      {isClientWithoutPieces ? null : <TaskPieces highlightedPieceId={highlightedPieceId} onChanged={onChanged} onSplit={onSplit} task={task} />}
    </Stack>
  );
}
