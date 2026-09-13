/* Turns /api/demo/status counts into the words the demo-data chip shows: a short form for the bar and the full
   sentences for its panel. Both come from stored records, so a label can't drift from what is on screen
   (roadmap 09, "Honest labeling of the demo's seams"). */
import type { DemoStatus } from './demoStatusTypes';

/** The chip's compact label, stating both seams at once, e.g. "Fixture spend · 2 simulated offers". */
export function describeSeamsShort(status: DemoStatus): string {
  return `${describeFinancialShort(status.financial.provenance)} · ${describeOffersShort(status.offers)}`;
}

/** Full sentence for the financial data seam. */
export function describeFinancial(provenance: string[]): string {
  if (provenance.length === 0) {
    return 'Nothing imported yet.';
  }
  if (provenance.every((value) => value === 'fixture')) {
    return 'Demo fixture transactions (labeled "fixture"), not a live bank connection.';
  }
  return `From ${provenance.join(', ')} sources, each labeled beside its figures.`;
}

/** Full sentence for the counteroffer seam. */
export function describeOffers(offers: DemoStatus['offers']): string {
  if (offers.total === 0) {
    return 'None yet.';
  }
  if (offers.genuine === 0) {
    return `All ${offers.total} shown are simulated demo data. No genuine counteroffer has arrived.`;
  }
  const simulated = offers.demo > 0 ? `; the other ${offers.demo} are simulated demo data` : '';
  return `${offers.genuine} genuine (${offers.captured_off_platform} captured off-platform)${simulated}.`;
}

/** Full sentence for the outreach seam, when the backend reports one. */
export function describeOutreach(outreach: NonNullable<DemoStatus['outreach']>): string {
  return outreach.delivers_real_email
    ? `${outreach.channel_label}. Invitations are real email, sent only after owner approval.`
    : `${outreach.channel_label}. Approved invitations are stored for review; no email leaves this machine.`;
}

/** Whether the chip should use the simulated (demo data) tone rather than neutral. */
export function isSimulated(status: DemoStatus): boolean {
  return status.offers.all_simulated || !status.financial.has_production_data;
}

function describeFinancialShort(provenance: string[]): string {
  if (provenance.length === 0) {
    return 'No spend imported';
  }
  if (provenance.every((value) => value === 'fixture')) {
    return 'Fixture spend';
  }
  if (provenance.every((value) => value === 'sandbox')) {
    return 'Sandbox spend';
  }
  return 'Mixed-source spend';
}

function describeOffersShort(offers: DemoStatus['offers']): string {
  if (offers.total === 0) {
    return 'no offers yet';
  }
  if (offers.genuine === 0) {
    return `${offers.total} simulated ${offers.total === 1 ? 'offer' : 'offers'}`;
  }
  return `${offers.genuine} genuine of ${offers.total} offers`;
}
