/* Step 2 of the offer trace: the offer being compared, its price restated per month, and the scope it covers.
   Coverage is scored against the scope version the offer answered, which step 3 shows. */
import { BiddingModePill } from '../../../../shared/components/BiddingModePill';
import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { Pill } from '../../../../shared/components/Pill';
import { formatTimestamp } from '../../../../shared/format/formatTimestamp';
import { scopeItemLabel } from '../../../../shared/format/scopeItemLabel';
import { ProvenanceBadge } from '../../../../shared/provenance/ProvenanceBadge';
import { Cluster, Grid, Stack, Stat } from '../../../../shared/ui';
import { Fact, FactList } from '../../chain/FactList';
import { TraceStep } from '../../chain/TraceStep';
import type { OfferTrace } from '../../types';

interface OfferStepProps {
  offer: OfferTrace['offer'];
  // The scope version this offer answered.
  scopeVersionNumber: number;
}

/** Render the offer step: price, monthly restatement, setup fee, timing, and scope coverage with its gaps. */
export function OfferStep({ offer, scopeVersionNumber }: OfferStepProps): JSX.Element {
  const money = (amountMinor: number): JSX.Element => <MoneyDisplay amountMinor={amountMinor} currency={offer.price_currency} />;
  const facts: Fact[] = [
    { label: 'Scope covered', value: `${Math.round(offer.scope_completeness * 100)}% of scope version ${scopeVersionNumber}` },
    { label: 'Includes', value: offer.scope_included.join(', ') || 'nothing stated' },
  ];
  if (offer.scope_excluded.length) {
    facts.push({ label: 'Excludes', value: offer.scope_excluded.join(', ') });
  }
  if (offer.missing_items.length) {
    facts.push({ label: 'Missing', value: <ItemPills items={offer.missing_items} tone="danger" /> });
  }
  if (offer.unstated_items.length) {
    facts.push({ label: 'Not stated', value: <ItemPills items={offer.unstated_items} tone="warning" /> });
  }

  return (
    <TraceStep
      badges={<><ProvenanceBadge kind="offer" value={offer.provenance} /><BiddingModePill mode={offer.bidding_mode_at_submission} /></>}
      leadsTo="The scope version this offer answered"
      step={2}
      title={`Offer from ${offer.challenger_name}`}
    >
      <Stack gap={4}>
        <Grid gap={5} minItemWidth="8rem">
          <Stat label="Offered price" size="md" unit={`/ ${offer.billing_frequency}`} value={money(offer.price_minor)} />
          <Stat label="Restated per month" size="md" unit="/ month" value={money(offer.normalized_monthly_minor)} />
          {offer.setup_fee_minor ? <Stat label="Plus a setup fee" size="md" value={money(offer.setup_fee_minor)} /> : null}
        </Grid>
        <p className="ui-text-sm ui-text-muted">
          Submitted {formatTimestamp(offer.submitted_at)}
          {offer.revised_at ? `, last revised ${formatTimestamp(offer.revised_at)} (${offer.revision_count} earlier ${offer.revision_count === 1 ? 'version' : 'versions'} kept)` : ''}.
        </p>
        <FactList facts={facts} />
      </Stack>
    </TraceStep>
  );
}

function ItemPills({ items, tone }: { items: string[]; tone: 'danger' | 'warning' }): JSX.Element {
  return (
    <Cluster gap={1}>
      {items.map((item) => <Pill key={item} tone={tone}>{scopeItemLabel(item)}</Pill>)}
    </Cluster>
  );
}
