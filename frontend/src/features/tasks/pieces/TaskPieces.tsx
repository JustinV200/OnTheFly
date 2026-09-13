/* The pieces this viewer split off the task, each with its status and one next action, and Undo while undo is still
   allowed. A client never sees its task owner's pieces; the server only sends the viewer's own. */
import { useState } from 'react';

import { ApiError, post } from '../../../shared/api/client';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Button, Callout, Card, Stack } from '../../../shared/ui';
import type { PieceLine, TaskDetail } from '../types';
import { PieceRow } from './PieceRow';
import './TaskPieces.css';

interface TaskPiecesProps {
  task: TaskDetail;
  onChanged: () => void;
  onSplit: () => void;
  // The piece just split off on this page, highlighted until the page changes task.
  highlightedPieceId: string | null;
}

/** Render the viewer's pieces, or why there are none. */
export function TaskPieces({ task, onChanged, onSplit, highlightedPieceId }: TaskPiecesProps): JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const splitIds = new Map((task.ledger?.pieces ?? []).map((piece) => [piece.child_task_id, piece.split_id]));

  const undo = async (piece: PieceLine): Promise<void> => {
    const splitId = splitIds.get(piece.task_id);
    if (!splitId) {
      return;
    }
    setUndoingId(piece.task_id);
    setError(null);
    try {
      await post(`/api/splits/${splitId}/undo`);
      onChanged();
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      setError(caught.message);
    } finally {
      setUndoingId(null);
    }
  };

  if (task.pieces.length === 0) {
    return (
      <EmptyState action={task.can_split ? <Button onClick={onSplit}>Split off a piece</Button> : undefined} title="No pieces split off">
        {task.can_split
          ? 'Split off requirements as their own task, priced as a cut of your starting price. The piece starts private.'
          : task.split_block_reason ?? 'This task can’t be split right now.'}
      </EmptyState>
    );
  }

  return (
    <Card title="Pieces you split off" titleLevel={2}>
      <Stack gap={3}>
        {error ? <Callout role="alert" title="Couldn’t undo that split" tone="danger"><p>{error}</p></Callout> : null}
        <ul className="task-pieces">
          {task.pieces.map((piece) => (
            <li key={piece.task_id}>
              <PieceRow
                billingPeriod={task.billing_period}
                currency={task.currency}
                isNew={piece.task_id === highlightedPieceId}
                isUndoable={piece.accepted_price_minor === null && splitIds.has(piece.task_id)}
                isUndoing={undoingId === piece.task_id}
                onUndo={() => void undo(piece)}
                piece={piece}
              />
            </li>
          ))}
        </ul>
        {task.can_split ? <div><Button onClick={onSplit}>Split off another piece</Button></div> : null}
      </Stack>
    </Card>
  );
}
