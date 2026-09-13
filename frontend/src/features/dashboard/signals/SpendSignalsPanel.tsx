/* Shows the fly-brain spend signals for one private expense: baseline basis, price changes, unusual charges (all charges on request).
   Each section carries the badge of the circuit that produced it, and the panel ends with FlyBrainNote.
   Owner-only data; this panel is never reused on public pages. */
import { ReactNode, useId } from 'react';

import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { FlyBrainBadge } from '../../../shared/flybrain/FlyBrainBadge';
import { FlyBrainNote } from '../../../shared/flybrain/FlyBrainNote';
import type { FlyBrainAttribution, FlyBrainComponent } from '../../../shared/flybrain/types';
import { Badge, Callout, Cluster, Icon, Stack } from '../../../shared/ui';
import { ChargeSignals } from './charges/ChargeSignals';
import { formatNotAnalyzedSummary } from './formatSignals';
import { BaselineBasisSummary } from './price/BaselineBasisSummary';
import { PriceChangeList } from './price/PriceChangeList';
import type { SpendSignalsReport } from './types';
import { useSpendSignals } from './useSpendSignals';

interface SpendSignalsPanelProps {
  expenseId: string;
}

/** Render the spend signals for one expense (the drawer's Signals tab): loading, unavailable, or the labelled report. */
export function SpendSignalsPanel({ expenseId }: SpendSignalsPanelProps): JSX.Element {
  const { report, isLoading, error } = useSpendSignals(expenseId);

  if (isLoading) {
    return <LoadingSpinner label="Loading spend signals…" />;
  }
  if (error || !report) {
    return <Callout role="alert" tone="danger">{error ?? 'Spend signals are unavailable.'}</Callout>;
  }
  return <SpendSignalsReportBody report={report} />;
}

function SpendSignalsReportBody({ report }: { report: SpendSignalsReport }): JSX.Element {
  const { baseline } = report;

  return (
    <Stack gap={5}>
      {report.not_analyzed_transactions.length > 0 ? (
        // The transaction list shows every stored row; say which ones these signals skipped.
        <p className="ui-text-sm ui-text-muted">
          Only posted charges are analyzed. Left out: {formatNotAnalyzedSummary(report.not_analyzed_transactions)} (listed
          with their status under Transactions).
        </p>
      ) : null}

      <SignalSection attribution={findAttribution(report.fly_brain, 'compound_eye')} title="Price">
        {baseline ? (
          <>
            <BaselineBasisSummary baseline={baseline} />
            <PriceChangeList currency={baseline.currency} priceLevels={report.price_levels} />
          </>
        ) : (
          // No posted charges: there is no baseline, which must not read as a $0 price.
          <p className="ui-text-muted">
            <strong>No baseline:</strong> no charge from this vendor has posted, so there is no price to explain or check for changes.
          </p>
        )}
      </SignalSection>

      <SignalSection
        attribution={findAttribution(report.fly_brain, 'mushroom_body_novelty')}
        status={
          report.unusual_charge_count > 0
            ? <Badge icon={<Icon name="alert-triangle" />} tone="warning">{report.unusual_charge_count} unusual</Badge>
            : null
        }
        title="Charges"
      >
        <ChargeSignals charges={report.charges} />
      </SignalSection>

      <FlyBrainNote attributions={report.fly_brain} />
    </Stack>
  );
}

interface SignalSectionProps {
  title: string;
  attribution: FlyBrainAttribution | undefined;
  // A count that needs attention, shown beside the title in words.
  status?: ReactNode;
  children: ReactNode;
}

function SignalSection({ title, attribution, status, children }: SignalSectionProps): JSX.Element {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <Stack gap={2}>
        <Cluster gap={2}>
          <h3 id={headingId}>{title}</h3>
          {status}
          {attribution ? <FlyBrainBadge attribution={attribution} /> : null}
        </Cluster>
        {children}
      </Stack>
    </section>
  );
}

function findAttribution(attributions: FlyBrainAttribution[], component: FlyBrainComponent): FlyBrainAttribution | undefined {
  return attributions.find((attribution) => attribution.component === component);
}
