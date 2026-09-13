/* Runs the split drawer for the task page: opening it blank or prefilled, and what happens after a split. The page stays
   on the parent task (roadmap: the owner should see its remainder drop), so this reads the figure that drops before the
   split, loads the task again from the API, and hands back a notice with both figures and the new piece's title. */
import { useState } from 'react';

import { ApiError, get } from '../../../shared/api/client';
import type { SplitPrefill } from '../../split/splitPrefill';
import type { TaskNotice } from '../notices/taskNotice';
import type { TaskDetail } from '../types';

export interface SplitFlow {
  isOpen: boolean;
  prefill: SplitPrefill | null;
  open: (prefill: SplitPrefill | null) => void;
  close: () => void;
  // Pass to SplitDrawer's onSplit.
  handleSplit: (childTaskId: string) => void;
}

/** Hold the drawer state; onSplitDone receives the notice and the new piece's id once the parent has been re-read. */
export function useSplitFlow(task: TaskDetail, onSplitDone: (notice: TaskNotice, childTaskId: string) => void): SplitFlow {
  const [isOpen, setIsOpen] = useState(false);
  const [prefill, setPrefill] = useState<SplitPrefill | null>(null);

  const handleSplit = async (childTaskId: string): Promise<void> => {
    const before = splitFigure(task);
    setIsOpen(false);
    let after: TaskDetail | null = null;
    try {
      after = await get<TaskDetail>(`/api/tasks/${task.id}`);
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      // The split itself succeeded; without a fresh read the notice leaves the figures out rather than guessing them.
      console.warn('Split succeeded but the task could not be re-read for the notice', caught);
    }
    onSplitDone(
      {
        kind: 'split',
        childTaskId,
        pieceTitle: after?.pieces.find((piece) => piece.task_id === childTaskId)?.title ?? null,
        figureLabel: before.label,
        beforeMinor: before.amountMinor,
        afterMinor: after ? splitFigure(after).amountMinor : null,
        currency: task.currency,
        billingPeriod: task.billing_period,
      },
      childTaskId,
    );
  };

  return {
    isOpen,
    prefill,
    open: (next) => {
      setPrefill(next);
      setIsOpen(true);
    },
    close: () => setIsOpen(false),
    handleSplit: (childTaskId) => void handleSplit(childTaskId),
  };
}

// The figure a split lowers: an owner's remainder after acceptance, or the poster's listed price before it (plan2,
// "Splitting and cuts"). Both are the server's numbers.
function splitFigure(task: TaskDetail): { label: string; amountMinor: number | null } {
  if (task.owner_money) {
    return { label: 'Remainder', amountMinor: task.owner_money.remainder_minor };
  }
  return { label: 'Listed price', amountMinor: task.buyer_money?.task_amount_minor ?? null };
}
