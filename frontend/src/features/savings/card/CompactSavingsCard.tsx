/* A group that isn't a suggestion (specialist market, needs rates, didn't qualify), kept small: the same equation and
   pass line showing what failed, the server's reasons in words, the honesty label, and "Split off manually" / Dismiss.
   A manual split from here is never sent as a suggestion (splitPrefill.isSuggestion is false for these tiers). */
import { Badge, Button, Card, Stack } from '../../../shared/ui';
import type { SavingsCardView } from '../types';
import { CardDetails } from './details/CardDetails';
import { SavingsEquation } from './figures/SavingsEquation';
import { ThresholdPassLine } from './figures/ThresholdPassLine';
import { HonestyLabel } from './labels/HonestyLabel';
import { ProvisionalNote } from './labels/ProvisionalNote';
import { tierWords } from './tierWords';
import './savingsCards.css';

interface CompactSavingsCardProps {
  card: SavingsCardView;
  canSplit: boolean;
  onSplitOff: () => void;
  onDismiss: () => void;
  onOversightSaved: () => void;
}

/** Render one non-suggested group as a compact card. */
export function CompactSavingsCard({ card, canSplit, onSplitOff, onDismiss, onOversightSaved }: CompactSavingsCardProps): JSX.Element {
  const requirementCount = card.inputs.requirements.length;
  return (
    <Card
      actions={<Badge tone="neutral">{tierWords(card.tier).badge}</Badge>}
      as="article"
      className="savings-compact"
      description={`${requirementCount === 1 ? '1 requirement' : `${requirementCount} requirements`} · ${card.psc} · NAICS ${card.naics}`}
      padding="md"
      title={card.labor_category}
      titleLevel={4}
    >
      <Stack gap={3}>
        <SavingsEquation card={card} size="sm" />
        <ThresholdPassLine card={card} />
        <ul className="savings-reasons">{card.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
        <HonestyLabel card={card} />
        <ProvisionalNote card={card} />
        <div className="savings-actions">
          {canSplit ? <Button onClick={onSplitOff} size="sm">Split off manually</Button> : null}
          <Button onClick={onDismiss} size="sm" variant="ghost">Dismiss</Button>
        </div>
        <CardDetails card={card} onOversightSaved={onOversightSaved} />
      </Stack>
    </Card>
  );
}
