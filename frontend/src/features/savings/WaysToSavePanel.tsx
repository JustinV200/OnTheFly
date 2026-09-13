/* Ways to save (roadmap 12, step 9): the owner's segments, priced three ways from its own rates and market evidence.
   Suggestions come first; specialist markets, segments that need rates, and the rest follow in their own sections, so a
   task where nothing qualifies says so plainly. Refresh queries the market-data source again. Owner-only. */
import { useState } from 'react';

import { ApiError, post } from '../../shared/api/client';
import { useApiQuery } from '../../shared/api/useApiQuery';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { formatMoneyText } from '../../shared/format/formatMoneyText';
import { formatTimestamp } from '../../shared/format/formatTimestamp';
import { Badge, Button, Callout, Card, Cluster, Disclosure, Icon, Stack } from '../../shared/ui';
import type { SplitPrefill } from '../split/splitPrefill';
import { SavingsCard } from './card/SavingsCard';
import type { SavingsCardView, SavingsTier, WaysToSaveResponse } from './types';
import './WaysToSavePanel.css';

interface WaysToSavePanelProps {
  taskId: string;
  canSplit: boolean;
  onSplitOff: (prefill: SplitPrefill) => void;
}

const SECTIONS: Array<{ tier: SavingsTier; title: string; description: string }> = [
  { tier: 'potential_savings', title: 'Suggested pieces', description: 'Every condition holds at the thresholds below.' },
  { tier: 'specialist_market', title: 'Specialist market — no modeled savings', description: 'Enough suppliers, but splitting doesn’t beat your own cost.' },
  { tier: 'needs_rates', title: 'Add your rates to find specific savings', description: 'Without your own rate for a labor category, nothing piece-specific can be said.' },
  { tier: 'not_viable', title: 'Not worth splitting on these numbers', description: 'Each card says which condition failed.' },
];

/** Render the Ways to save panel for a task the viewer owns. */
export function WaysToSavePanel({ taskId, canSplit, onSplitOff }: WaysToSavePanelProps): JSX.Element {
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
      : <LoadingSpinner label="Pricing your segments against market evidence…" />;
  }
  const data = query.data;
  const live = data.cards.filter((card) => card.status !== 'split');
  const dismissed = live.filter((card) => card.status === 'dismissed');
  const isCapReached = data.active_suggested_pieces >= data.max_suggested_pieces;
  const isDemoSource = data.market_data_source === 'demo_market_data';

  return (
    <Stack gap={5}>
      <Card
        actions={<Button iconStart={<Icon name="search" />} isBusy={isRefreshing} onClick={() => void refresh()} size="sm">{isRefreshing ? 'Querying…' : 'Refresh evidence'}</Button>}
        description="Each segment groups requirements by confirmed labor category, PSC and NAICS. Keep cost uses your own rates; the suggested cut uses the median market rate for the same hours."
        title="Ways to save"
      >
        <Stack gap={3}>
          <Cluster gap={2}>
            {isDemoSource ? (
              <Badge tone="simulated" title="Fictional suppliers, UEIs, awards and rates for the simulator; not USAspending or GSA CALC+.">
                Source: demo market data
              </Badge>
            ) : data.market_data_source === 'usaspending' ? (
              // The live source answers suppliers only; saying so here keeps "rates not checked" from being a surprise on each card.
              <Badge tone="info" title="Public USAspending prime awards and reported subawards. No public labor-rate source is connected yet.">
                Source: USAspending public records · rates not checked
              </Badge>
            ) : (
              <Badge tone="info">Source: {data.market_data_source}</Badge>
            )}
            <Badge tone="neutral">{data.active_suggested_pieces} of {data.max_suggested_pieces} suggested pieces used</Badge>
            {live[0] ? <span className="ui-text-xs ui-text-muted">Computed {formatTimestamp(live[0].computed_at)}</span> : null}
          </Cluster>
          <ThresholdLine response={data} />
          {isCapReached ? (
            <Callout role="note" title="Suggestion cap reached" tone="warning">
              <p>This task already has {data.max_suggested_pieces} suggested pieces. You can still split off pieces manually.</p>
            </Callout>
          ) : null}
          {actionError ? <Callout role="alert" title="That didn’t work" tone="danger"><p>{actionError.message}</p></Callout> : null}
        </Stack>
      </Card>

      {live.length === 0 ? (
        <EmptyState title="Nothing left to price">
          {data.untagged_requirements.length > 0
            ? 'Every requirement still with this task needs confirmed labor category, PSC and NAICS tags before it can be priced.'
            : 'Every requirement already went to a piece.'}
        </EmptyState>
      ) : null}

      {SECTIONS.map((section) => {
        const cards = live.filter((card) => card.tier === section.tier && card.status === 'suggested');
        if (cards.length === 0) {
          return section.tier === 'potential_savings' && live.length > 0 ? (
            <Callout key={section.tier} role="status" title="No segment qualifies as a suggestion" tone="info">
              <p>Nothing here beats your own cost at the thresholds shown. You can still split off a piece manually; the cards below show why each segment didn’t qualify.</p>
            </Callout>
          ) : null;
        }
        return (
          <section aria-label={section.title} className="ways-to-save__section" key={section.tier}>
            <h3 className="ways-to-save__heading">{section.title}</h3>
            <p className="ways-to-save__description">{section.description}</p>
            <div className="ways-to-save__cards">
              {cards.map((card) => (
                <SavingsCard
                  canSplit={canSplit && (card.tier !== 'potential_savings' || !isCapReached)}
                  card={card}
                  key={card.id}
                  onDismiss={() => void act(() => post(`/api/savings-cards/${card.id}/dismiss`))}
                  onOversightSaved={query.reload}
                  onSplitOff={() => onSplitOff(prefillFrom(card))}
                />
              ))}
            </div>
          </section>
        );
      })}

      {dismissed.length > 0 ? (
        <Disclosure summary={`Dismissed for this scope version (${dismissed.length})`} variant="card">
          <ul className="ways-to-save__dismissed">
            {dismissed.map((card) => (
              <li key={card.id}>
                {card.labor_category} · {card.psc}
                <Button onClick={() => void act(() => post(`/api/savings-cards/${card.id}/restore`))} size="sm" variant="link">Restore</Button>
              </li>
            ))}
          </ul>
        </Disclosure>
      ) : null}

      {data.untagged_requirements.length > 0 ? (
        <Callout role="note" title="Not priced: tags not confirmed" tone="neutral">
          <ul>{data.untagged_requirements.map((requirement) => <li key={requirement.key}>{requirement.text}</li>)}</ul>
        </Callout>
      ) : null}
    </Stack>
  );
}

function ThresholdLine({ response }: { response: WaysToSaveResponse }): JSX.Element {
  const { thresholds } = response;
  return (
    <p className="ui-text-sm ui-text-muted">
      Suggested only when modeled savings reach {(thresholds.min_basis_points / 100).toFixed(0)}% of keep cost and{' '}
      {formatMoneyText(thresholds.min_annual_minor, 'USD')} a year, with at least {thresholds.min_suppliers} distinct suppliers by UEI over{' '}
      {thresholds.lookback_years} years. Thresholds come from configuration and are never tuned per task.
    </p>
  );
}

function prefillFrom(card: SavingsCardView): SplitPrefill {
  const range = card.suggested_cut_low_minor !== null && card.suggested_cut_high_minor !== null
    ? `Market rates put the same hours between ${formatMoneyText(card.suggested_cut_low_minor, card.currency)} and ${formatMoneyText(card.suggested_cut_high_minor, card.currency)} (25th–75th percentile). ${card.label}.`
    : card.label;
  return {
    savingsCardId: card.id,
    isSuggestion: card.tier === 'potential_savings',
    requirementKeys: card.inputs.requirements.map((requirement) => requirement.key),
    cutMinor: card.suggested_cut_minor ?? 0,
    title: card.inputs.requirements.length === 1 ? card.inputs.requirements[0].text : `${card.labor_category} work`,
    label: card.label,
    cutRangeText: range,
  };
}
