/* Step 1 of the offer trace: the potential-savings figure and its arithmetic, or why this offer has none.
   Every figure comes from the server; an unranked offer gets its reason, never a figure made up here. */
import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { ProvenanceBadge } from '../../../../shared/provenance/ProvenanceBadge';
import { Badge, Stack, Stat } from '../../../../shared/ui';
import { TraceStep } from '../../chain/TraceStep';
import type { OfferTrace } from '../../types';
import './SavingsStep.css';

interface SavingsStepProps {
  savings: OfferTrace['savings'];
  unrankedReason: string | null;
  // The version the offer answered, named when it isn't the listing's current one, since its baseline is that version's price.
  earlierScopeVersion: number | null;
  // The offer's stored provenance, shown beside the figure it produced.
  offerProvenance: string;
}

/** Render the first trace step for one offer. */
export function SavingsStep({ savings, unrankedReason, earlierScopeVersion, offerProvenance }: SavingsStepProps): JSX.Element {
  if (!savings) {
    return (
      <TraceStep leadsTo="The offer being compared" step={1} title="No potential savings figure">
        <p>This offer is not ranked: {unrankedReason ?? 'no savings figure was computed'}.</p>
      </TraceStep>
    );
  }

  const money = (amountMinor: number): JSX.Element => <MoneyDisplay amountMinor={amountMinor} currency={savings.currency} />;
  const baselineName = earlierScopeVersion === null ? 'current' : `price on scope v${earlierScopeVersion}`;
  return (
    <TraceStep leadsTo="The offer being compared" step={1} title={savings.label}>
      <Stack gap={4}>
        <Stat
          caption={(
            <>
              {savings.is_provisional ? <Badge tone="warning">Provisional</Badge> : null}
              <ProvenanceBadge kind="offer" value={offerProvenance} />
              <span>Potential until a switch actually happens. Computed by the server, not estimated.</span>
            </>
          )}
          label="First year"
          size="xl"
          // Green only for an actual saving; a negative figure stays neutral, and the label says what it is either way.
          tone={savings.first_year_net_savings_minor > 0 ? 'success' : 'default'}
          value={money(savings.first_year_net_savings_minor)}
        />
        <div className="trace-savings__math">
          <p>
            ({money(savings.baseline_monthly_minor)} {baselineName} − {money(savings.offer_monthly_minor)} offer) × 12 months ={' '}
            <strong>{money(savings.annual_recurring_savings_minor)}</strong> annual recurring
          </p>
          <p>
            then first-year costs subtracted = <strong>{money(savings.first_year_net_savings_minor)}</strong>
          </p>
        </div>
        {savings.assumptions.length > 0 ? (
          <div>
            {savings.is_provisional ? <p className="trace-savings__because">Provisional, because:</p> : null}
            <ul className="trace-savings__assumptions">{savings.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        ) : null}
      </Stack>
    </TraceStep>
  );
}
