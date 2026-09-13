/* States the demo's seams on every screen: what the financial data is and whether any offer is genuine.
   Driven by stored records, and shown as a warning when unavailable, never hidden (roadmap 09, "Honest labeling of the demo's seams"). */
import type { ReactNode } from 'react';

import { useApiQuery } from '../../shared/api/useApiQuery';
import type { DemoStatus } from './demoStatusTypes';

// The endpoint is a few counts, so a short poll is cheap and keeps the label current right after
// an offer lands (a stale "none yet" beside a fresh offer would undercut the label).
const POLL_INTERVAL_MS = 5000;

/** Render the always-visible demo-honesty strip. */
export function DemoSeamsBanner(): JSX.Element {
  const { data, error } = useApiQuery<DemoStatus>('/api/demo/status', { pollIntervalMs: POLL_INTERVAL_MS });

  if (!data) {
    return (
      <Strip tone={error ? 'danger' : 'neutral'}>
        {error
          ? `Demo data labels unavailable (${error.message}). Treat every figure as unverified.`
          : 'Checking where this demo’s data comes from…'}
      </Strip>
    );
  }

  return (
    <Strip tone={data.offers.all_simulated || !data.financial.has_production_data ? 'simulated' : 'neutral'}>
      <div>
        <strong>Financial data: </strong>
        {describeFinancial(data.financial.provenance)}
      </div>
      <div>
        <strong>Counteroffers: </strong>
        {describeOffers(data.offers)}
      </div>
    </Strip>
  );
}

function describeFinancial(provenance: string[]): string {
  if (provenance.length === 0) {
    return 'nothing imported yet.';
  }
  if (provenance.every((value) => value === 'fixture')) {
    return 'demo fixture transactions (labeled "fixture"), not a live bank connection.';
  }
  return `from ${provenance.join(', ')} sources, each labeled beside its figures.`;
}

function describeOffers(offers: DemoStatus['offers']): string {
  if (offers.total === 0) {
    return 'none yet.';
  }
  if (offers.genuine === 0) {
    return `all ${offers.total} shown are simulated demo data. No genuine counteroffer has arrived.`;
  }
  const simulated = offers.demo > 0 ? `; the other ${offers.demo} are simulated demo data` : '';
  return `${offers.genuine} genuine (${offers.captured_off_platform} captured off-platform)${simulated}.`;
}

interface StripProps {
  tone: 'neutral' | 'simulated' | 'danger';
  children: ReactNode;
}

function Strip({ tone, children }: StripProps): JSX.Element {
  const colors = {
    neutral: { background: '#f1f5f9', border: '#cbd5e1', color: '#0f172a' },
    simulated: { background: '#fff7ed', border: '#fdba74', color: '#7c2d12' },
    danger: { background: '#fef2f2', border: '#fecaca', color: '#7f1d1d' },
  }[tone];
  return (
    <aside
      aria-label="Demo data labels"
      style={{
        backgroundColor: colors.background,
        border: `1px solid ${colors.border}`,
        borderRadius: '10px',
        color: colors.color,
        fontSize: '0.9rem',
        marginTop: '0.75rem',
        padding: '0.5rem 0.9rem',
      }}
    >
      {children}
    </aside>
  );
}
