/* Step 1 of the offer trace: the arithmetic behind the potential-savings figure the headline shows, and the assumptions
   that make it provisional, or why this offer has none. Every figure comes from the server; nothing is computed here. */
import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { ProvenanceBadge } from '../../../../shared/provenance/ProvenanceBadge';
import { Badge, Stack } from '../../../../shared/ui';
// Shared with the inbox so an assumption reads the same under the figure there and here.
import { describeAssumption } from '../../../inbox/savings/describeAssumption';
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
    <TraceStep
      badges={(
        <>
          {savings.is_provisional ? <Badge tone="warning">Provisional</Badge> : null}
          <ProvenanceBadge kind="offer" value={offerProvenance} />
        </>
      )}
      leadsTo="The offer being compared"
      step={1}
      title={savings.label}
    >
      <Stack gap={4}>
        <p className="trace-savings__note">Potential until a switch actually happens. Computed by the server, not estimated.</p>
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
            <ul className="trace-savings__assumptions">{savings.assumptions.map((item) => <li key={item}>{describeAssumption(item)}</li>)}</ul>
          </div>
        ) : null}
      </Stack>
    </TraceStep>
  );
}
