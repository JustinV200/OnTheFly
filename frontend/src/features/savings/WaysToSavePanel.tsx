/* Ways to save (roadmap 12, step 9): the owner's groups of requirements, priced from its own rates and market evidence.
   It leads with what to do: suggested pieces as hero cards (or a plain "no piece clears the thresholds"), then every
   other group collapsed into one disclosure, then dismissed cards and untagged requirements. Refresh queries the
   market-data source again. Owner-only; every figure, tier and reason is the server's. */
import { useState } from 'react';

import { ApiError, post } from '../../shared/api/client';
import { useApiQuery } from '../../shared/api/useApiQuery';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { Button, Stack } from '../../shared/ui';
import type { SplitPrefill } from '../split/splitPrefill';
import { WaysToSaveHeader } from './header/WaysToSaveHeader';
import { LeftoverLists } from './others/LeftoverLists';
import { OtherGroups } from './others/OtherGroups';
import { prefillFrom } from './prefillFrom';
import { SuggestedPieces } from './suggestions/SuggestedPieces';
import type { SavingsCardView, WaysToSaveResponse } from './types';

interface WaysToSavePanelProps {
  taskId: string;
  canSplit: boolean;
  // The server's words for why splitting is blocked (TaskDetail.split_block_reason); null when it isn't.
  splitBlockReason: string | null;
  // How many requirement rows the task's scope has, so an empty panel can tell "no rows yet" from "all rows split off".
  requirementCount: number;
  onSplitOff: (prefill: SplitPrefill) => void;
  onSplitManually: () => void;
  // Set by the task page's "Ways to save" button: bring the top suggestion into view once cards load, then clear it.
  isFocusRequested: boolean;
  onFocusHandled: () => void;
}

/** Render the Ways to save panel for a task the viewer owns. */
export function WaysToSavePanel(props: WaysToSavePanelProps): JSX.Element {
  const { taskId, canSplit, splitBlockReason, requirementCount, onSplitOff, onSplitManually } = props;
  const query = useApiQuery<WaysToSaveResponse>(`/api/tasks/${taskId}/ways-to-save`);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionError, setActionError] = useState<ApiError | null>(null);

  const act = async (action: () => Promise<unknown>): Promise<void> => {
    setActionError(null);
    try {
      await action();
      query.reload();
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      setActionError(caught);
    }
  };

  const refresh = async (): Promise<void> => {
    setIsRefreshing(true);
    await act(() => post(`/api/tasks/${taskId}/ways-to-save/refresh`));
    setIsRefreshing(false);
  };

  if (!query.data) {
    return query.error
      ? <ErrorState error={query.error} onRetry={query.reload} title="Couldn’t load Ways to save" />
      : <LoadingSpinner label="Pricing your requirements against market evidence…" />;
  }
  const data = query.data;
  const live = data.cards.filter((card) => card.status !== 'split');
  const open = live.filter((card) => card.status === 'suggested');
  const suggested = open.filter((card) => card.tier === 'potential_savings');
  const others = open.filter((card) => card.tier !== 'potential_savings');
  const isCapReached = data.active_suggested_pieces >= data.max_suggested_pieces;
  const heroBlockReason = !canSplit
    ? splitBlockReason ?? 'Splitting isn’t available on this task right now.'
    : isCapReached ? 'Suggestion cap reached: split off a piece yourself instead.' : null;
  const dismiss = (card: SavingsCardView): void => void act(() => post(`/api/savings-cards/${card.id}/dismiss`));

  return (
    <Stack gap={5}>
      <WaysToSaveHeader
        computedAt={live[0]?.computed_at ?? null}
        data={data}
        errorMessage={actionError?.message ?? null}
        isRefreshing={isRefreshing}
        onRefresh={() => void refresh()}
      />

      {live.length === 0 ? (
        <EmptyState action={canSplit ? <Button onClick={onSplitManually}>Split off a piece</Button> : undefined} title="Nothing left to price">
          {data.untagged_requirements.length > 0
            ? 'Every requirement still with this task needs confirmed labor category, PSC and NAICS tags before it can be priced.'
            : requirementCount === 0
              ? 'This task has no requirement rows yet, so there is nothing to price. You can still split off a piece yourself and add its requirements there.'
              : 'Every requirement already went to a piece.'}
        </EmptyState>
      ) : (
        <SuggestedPieces
          canSplitManually={canSplit}
          cards={suggested}
          isFocusRequested={props.isFocusRequested}
          onDismiss={dismiss}
          onFocusHandled={props.onFocusHandled}
          onOversightSaved={query.reload}
          onSplitManually={onSplitManually}
          onSplitOff={(card) => onSplitOff(prefillFrom(card))}
          splitBlockReason={heroBlockReason}
        />
      )}

      <OtherGroups
        canSplit={canSplit}
        cards={others}
        hasSuggestions={suggested.length > 0}
        onDismiss={dismiss}
        onOversightSaved={query.reload}
        onSplitOff={(card) => onSplitOff(prefillFrom(card))}
      />

      <LeftoverLists
        dismissed={live.filter((card) => card.status === 'dismissed')}
        onRestore={(card) => void act(() => post(`/api/savings-cards/${card.id}/restore`))}
        untagged={data.untagged_requirements}
      />
    </Stack>
  );
}
