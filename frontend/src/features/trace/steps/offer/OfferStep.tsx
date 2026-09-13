/* Step 2 of the offer trace: the offer being compared, its price restated per month, and the scope it covers.
   Coverage is scored against the scope version the offer answered, which step 3 shows. On a listing scoped as requirement
   rows the offer answers each requirement (step 3 lists them), so its empty free-text lists aren't reported as "nothing". */
import { BiddingModePill } from '../../../../shared/components/BiddingModePill';
import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { Pill } from '../../../../shared/components/Pill';
import { formatTimestamp } from '../../../../shared/format/formatTimestamp';
import { scopeItemLabel } from '../../../../shared/format/scopeItemLabel';
import { cadenceSuffix } from '../../../../shared/market';
import { ProvenanceBadge } from '../../../../shared/provenance/ProvenanceBadge';
import { Cluster, Grid, Stack, Stat } from '../../../../shared/ui';
import { Fact, FactList } from '../../chain/FactList';
import { TraceStep } from '../../chain/TraceStep';
import type { TraceRequirementContext } from '../../requirements/useTraceRequirements';
import type { OfferTrace } from '../../types';

interface OfferStepProps {
  offer: OfferTrace['offer'];
  // The scope version this offer answered.
  scopeVersionNumber: number;
  requirementContext: TraceRequirementContext;
}

/** Render the offer step: price, monthly restatement, setup fee, timing, and scope coverage with its gaps. */
export function OfferStep({ offer, scopeVersionNumber, requirementContext }: OfferStepProps): JSX.Element {
  const money = (amountMinor: number): JSX.Element => <MoneyDisplay amountMinor={amountMinor} currency={offer.price_currency} />;
  const facts: Fact[] = [
    { label: 'Scope covered', value: `${Math.round(offer.scope_completeness * 100)}% of scope version ${scopeVersionNumber}` },
    ...inclusionFacts(offer, requirementContext),
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
          <Stat label="Offered price" size="md" unit={cadenceSuffix(offer.billing_frequency)} value={money(offer.price_minor)} />
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

// What the offer includes. Until the listing's requirement rows load, an empty free-text list is left out rather than
// called "nothing stated", since the offer may have answered every requirement instead.
function inclusionFacts(offer: OfferTrace['offer'], context: TraceRequirementContext): Fact[] {
  const hasFreeText = offer.scope_included.length > 0;
  if (context.status !== 'ready') {
    return hasFreeText ? [{ label: 'Includes', value: offer.scope_included.join(', ') }] : [];
  }
  if (context.requirements.length === 0) {
    return [{ label: 'Includes', value: offer.scope_included.join(', ') || 'nothing stated' }];
  }

  const facts: Fact[] = [];
  if (context.answers !== null) {
    const includedCount = context.answers.filter((answer) => answer.is_included).length;
    facts.push({ label: 'Requirements included', value: `${includedCount} of ${context.answers.length} (step 3 lists each one)` });
  }
  if (hasFreeText) {
    facts.push({ label: 'Also includes', value: offer.scope_included.join(', ') });
  }
  return facts;
}

function ItemPills({ items, tone }: { items: string[]; tone: 'danger' | 'warning' }): JSX.Element {
  return (
    <Cluster gap={1}>
      {items.map((item) => <Pill key={item} tone={tone}>{scopeItemLabel(item)}</Pill>)}
    </Cluster>
  );
}
