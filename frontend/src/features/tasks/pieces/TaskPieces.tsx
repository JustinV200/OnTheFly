/* The pieces this viewer split off the task: each with its cut, its accepted price once there is one, its listing state
   and offers, and Undo while undo is still allowed. A client never sees its task owner's pieces; the server only sends
   the viewer's own. */
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ApiError, post } from '../../../shared/api/client';
import { EmptyState } from '../../../shared/components/EmptyState';
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { cadenceSuffix } from '../../../shared/market';
import { Badge, Button, Callout, Card, Stack } from '../../../shared/ui';
import { stateLabel } from '../labels/taskLabels';
import type { PieceLine, TaskDetail } from '../types';
import './TaskPieces.css';

interface TaskPiecesProps {
  task: TaskDetail;
  onChanged: () => void;
  onSplit: () => void;
}

/** Render the viewer's pieces, or why there are none. */
export function TaskPieces({ task, onChanged, onSplit }: TaskPiecesProps): JSX.Element {
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
      <EmptyState action={task.can_split ? <Button onClick={onSplit} variant="primary">Split off a piece</Button> : undefined} title="No pieces split off">
        {task.can_split
          ? 'Split off requirements as their own task, priced as a cut of your starting price. The piece starts private.'
          : task.split_block_reason ?? 'This task can’t be split right now.'}
      </EmptyState>
    );
  }

  return (
    <Stack gap={3}>
      {error ? <Callout role="alert" title="Couldn’t undo that split" tone="danger"><p>{error}</p></Callout> : null}
      <ul className="task-pieces">
        {task.pieces.map((piece) => {
          const state = stateLabel(piece.status);
          const isUndoable = piece.accepted_price_minor === null && splitIds.has(piece.task_id);
          return (
            <li key={piece.task_id}>
              <Card as="article" padding="md">
                <div className="task-pieces__row">
                  <div className="task-pieces__names">
                    <Link className="task-pieces__title" to={`/tasks/${piece.task_id}`}>{piece.title ?? 'Untitled piece'}</Link>
                    <span className="task-pieces__badges">
                      <Badge tone={state.tone}>{state.text}</Badge>
                      {piece.is_subcontract ? <Badge tone="warning">Subcontract</Badge> : null}
                      <Badge tone="neutral">{piece.offer_count === 1 ? '1 offer' : `${piece.offer_count} offers`}</Badge>
                      {piece.accepted_bidder ? <Badge tone="info">Won by {piece.accepted_bidder.business_name}</Badge> : null}
                    </span>
                  </div>
                  <div className="task-pieces__figures">
                    <span>Cut <MoneyDisplay amountMinor={piece.cut_minor} currency={task.currency} /> {cadenceSuffix(task.billing_period)}</span>
                    <span>
                      {piece.accepted_price_minor === null ? 'Not accepted yet' : <>Accepted <MoneyDisplay amountMinor={piece.accepted_price_minor} currency={task.currency} /></>}
                    </span>
                  </div>
                  <div className="task-pieces__actions">
                    <Link to={`/tasks/${piece.task_id}`}>Open piece</Link>
                    {isUndoable ? (
                      <Button isBusy={undoingId === piece.task_id} onClick={() => void undo(piece)} size="sm">
                        {undoingId === piece.task_id ? 'Undoing…' : 'Undo split'}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
      {task.can_split ? <Button onClick={onSplit}>Split off another piece</Button> : null}
    </Stack>
  );
}
