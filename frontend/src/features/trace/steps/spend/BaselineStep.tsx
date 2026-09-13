/* Step 5 of the offer trace: the price baseline the offer is measured against, and where that baseline came from.
   A re-scope never reframes an offer, so an older offer keeps the price of the version it answered. */
import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { Grid, Stack, Stat } from '../../../../shared/ui';
import { TraceStep } from '../../chain/TraceStep';
import type { OfferTrace } from '../../types';

interface BaselineStepProps {
  baseline: OfferTrace['baseline'];
  scope: OfferTrace['scope_version'];
}

/** Render the baseline step: the price, its monthly restatement, and its source in words. */
export function BaselineStep({ baseline, scope }: BaselineStepProps): JSX.Element {
  const money = (amountMinor: number): JSX.Element => <MoneyDisplay amountMinor={amountMinor} currency={baseline.currency} />;
  return (
    <TraceStep
      leadsTo="The private expense behind that price"
      step={5}
      title={scope.is_listing_current_version ? 'Current price baseline' : `Price baseline on scope version ${scope.version_number}`}
    >
      <Stack gap={4}>
        <Grid gap={5} minItemWidth="8rem">
          <Stat label="Baseline price" size="md" unit={`/ ${baseline.cadence}`} value={money(baseline.amount_minor)} />
          <Stat label="Restated per month" size="md" unit="/ month" value={money(baseline.monthly_minor)} />
        </Grid>
        <p>
          {baseline.source === 'owner_confirmed_scope'
            ? `Confirmed by the owner on scope version ${baseline.confirmed_on_scope_version} (prefilled from the transactions below).`
            : 'Taken directly from the transaction baseline below.'}
          {scope.is_listing_current_version ? null : ' This offer answered that version, so it is measured against that price, not the listing’s current one.'}
        </p>
      </Stack>
    </TraceStep>
  );
}
