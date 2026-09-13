/* One Ways to save card: the requirements it covers and their hours, keep cost against the suggested cut, the owner's
   oversight cost, and modeled savings, marked potential and provisional where it applies. The honesty label sits under the
   figures, never behind a click; sources, awards, not-checked sources and thresholds are one disclosure away. */
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { cadenceSuffix } from '../../../shared/market';
import { Badge, Button, Card, Stack, Stat } from '../../../shared/ui';
import type { SavingsCardView } from '../types';
import { CardEvidence } from './CardEvidence';
import { OversightControl } from './OversightControl';
import './SavingsCard.css';

interface SavingsCardProps {
  card: SavingsCardView;
  canSplit: boolean;
  onSplitOff: () => void;
  onDismiss: () => void;
  onOversightSaved: () => void;
}

/** Render one savings card. */
export function SavingsCard({ card, canSplit, onSplitOff, onDismiss, onOversightSaved }: SavingsCardProps): JSX.Element {
  const unit = cadenceSuffix(card.billing_period);
  const money = (minor: number | null): JSX.Element => (minor === null ? <span className="ui-text-muted">—</span> : <MoneyDisplay amountMinor={minor} currency={card.currency} />);
  const savings = card.modeled_savings_minor;
  const suppliers = card.inputs.suppliers.count;

  return (
    <Card
      actions={card.is_provisional ? <Badge tone="warning">Provisional</Badge> : undefined}
      as="article"
      className="savings-card"
      description={`${card.psc} · NAICS ${card.naics} · ${card.hours_total === null ? 'hours unanswered' : `${card.hours_total.toLocaleString('en-US')} h per ${card.billing_period} period`}`}
      title={card.labor_category}
      titleLevel={4}
    >
      <Stack gap={4}>
        <ul className="savings-card__requirements">
          {card.inputs.requirements.map((requirement) => (
            <li key={requirement.key}>
              {requirement.text}
              {requirement.hours_status !== 'confirmed' ? <> <Badge tone="warning">Hours are an estimate</Badge></> : null}
            </li>
          ))}
        </ul>

        <div className="savings-card__figures">
          <Stat caption={rateCaption(card)} label="Keep cost" size="md" unit={card.keep_cost_minor === null ? undefined : unit} value={money(card.keep_cost_minor)} />
          <Stat caption="Same hours × median market rate" label="Suggested cut" size="md" unit={card.suggested_cut_minor === null ? undefined : unit} value={money(card.suggested_cut_minor)} />
          <Stat
            caption={card.modeled_savings_basis_points === null ? 'Not computable' : `${(card.modeled_savings_basis_points / 100).toFixed(1)}% of keep cost`}
            label="Potential savings (modeled)"
            size="md"
            tone={savings !== null && savings > 0 ? 'success' : savings !== null && savings < 0 ? 'danger' : 'default'}
            unit={savings === null ? undefined : unit}
            value={money(savings)}
          />
        </div>
        {/* The simulated tone means demo data (design system); public evidence keeps the label in a neutral tone. */}
        <p className={isDemoEvidence(card) ? 'savings-card__label savings-card__label--demo' : 'savings-card__label'}>{card.label}</p>

        <OversightControl card={card} onSaved={onOversightSaved} />

        <p className="savings-card__suppliers">
          {suppliers.distinct_uei_count} distinct supplier{suppliers.distinct_uei_count === 1 ? '' : 's'} by UEI · {suppliers.award_count} award
          {suppliers.award_count === 1 ? '' : 's'} ({suppliers.prime_award_count} prime, {suppliers.subaward_count} sub)
          {suppliers.records_without_uei > 0 ? ` · ${suppliers.records_without_uei} without a UEI, not counted` : ''}
        </p>

        {card.tier !== 'potential_savings' || card.reasons.length > 1 ? (
          <ul className="savings-card__reasons">{card.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
        ) : null}

        <CardEvidence card={card} />

        <div className="savings-card__actions">
          {canSplit ? (
            <Button onClick={onSplitOff} variant={card.tier === 'potential_savings' ? 'primary' : 'secondary'}>
              {card.tier === 'potential_savings' ? 'Split off' : 'Split off manually'}
            </Button>
          ) : null}
          <Button onClick={onDismiss} variant="ghost">Dismiss</Button>
        </div>
      </Stack>
    </Card>
  );
}

function isDemoEvidence(card: SavingsCardView): boolean {
  return card.inputs.cut_basis.provenance === 'demo_data' || card.inputs.suppliers.provenance === 'demo_data';
}

function rateCaption(card: SavingsCardView): string {
  const rate = card.inputs.rate;
  if (rate.rate_minor_per_hour === null) {
    return `No rate for ${rate.labor_category}`;
  }
  const kind = rate.kind === 'current_contract_rate' ? 'your contract rate' : 'your internal cost';
  const provenance = rate.provenance === 'fixture' ? ' (fixture · demo data)' : '';
  return `${(rate.rate_minor_per_hour / 100).toLocaleString('en-US', { style: 'currency', currency: card.currency })}/h, ${kind}${provenance}`;
}
