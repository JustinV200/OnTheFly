/* One piece the viewer split off: its title and status, its cut and accepted price, and one next action linking to the
   piece (Publish, Review offers (n), or who accepted it), plus Undo while undo is still allowed. A freshly split piece
   is highlighted so the row the success message talks about is easy to find. */
import { Link } from 'react-router-dom';

import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { cadenceSuffix } from '../../../shared/market';
import { Badge, Button, ButtonLink, Card } from '../../../shared/ui';
import { stateLabel } from '../labels/taskLabels';
import type { PieceLine } from '../types';
import { pieceNextAction } from './pieceNextAction';

interface PieceRowProps {
  piece: PieceLine;
  currency: string;
  billingPeriod: string;
  isNew: boolean;
  isUndoable: boolean;
  isUndoing: boolean;
  onUndo: () => void;
}

/** Render one piece row. */
export function PieceRow({ piece, currency, billingPeriod, isNew, isUndoable, isUndoing, onUndo }: PieceRowProps): JSX.Element {
  const state = stateLabel(piece.status);
  const action = pieceNextAction(piece);
  const pieceUrl = `/tasks/${piece.task_id}`;

  return (
    <Card as="article" className={isNew ? 'task-pieces__card task-pieces__card--new' : 'task-pieces__card'} padding="md" tone="subtle">
      <div className="task-pieces__row">
        <div className="task-pieces__names">
          <Link className="task-pieces__title" to={pieceUrl}>{piece.title ?? 'Untitled piece'}</Link>
          <span className="task-pieces__badges">
            {isNew ? <Badge tone="brand">Just split off</Badge> : null}
            <Badge tone={state.tone}>{state.text}</Badge>
            {piece.is_subcontract ? <Badge tone="warning">Subcontract</Badge> : null}
          </span>
        </div>
        <div className="task-pieces__figures">
          <span>Cut <MoneyDisplay amountMinor={piece.cut_minor} currency={currency} /> {cadenceSuffix(billingPeriod)}</span>
          {/* Before acceptance the state badge and the action already say so; a third "not yet" line added nothing. */}
          {piece.accepted_price_minor === null ? null : (
            <span>Accepted at <MoneyDisplay amountMinor={piece.accepted_price_minor} currency={currency} /> {cadenceSuffix(billingPeriod)}</span>
          )}
        </div>
        <div className="task-pieces__actions">
          {action.isNeeded ? (
            <ButtonLink size="sm" to={pieceUrl}>{action.label}</ButtonLink>
          ) : (
            <>
              <span className="task-pieces__status">{action.label}</span>
              <Link to={pieceUrl}>Open piece</Link>
            </>
          )}
          {isUndoable ? (
            <Button isBusy={isUndoing} onClick={onUndo} size="sm" variant="ghost">
              {isUndoing ? 'Undoing…' : 'Undo split'}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
