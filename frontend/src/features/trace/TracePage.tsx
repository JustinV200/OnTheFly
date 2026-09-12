/* Traces one potential-savings figure down to the transactions behind it, one linked step at a time.
   That chain is the product's claim to credibility (roadmap 09, step 9). Every figure comes from the server. */
import { Link, useParams } from 'react-router-dom';

import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { useApiQuery } from '../../shared/api/useApiQuery';
import { BiddingModePill } from '../../shared/components/BiddingModePill';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { categoryLabel } from '../../shared/format/categoryLabel';
import { formatTimestamp } from '../../shared/format/formatTimestamp';
import { scopeItemLabel } from '../../shared/format/scopeItemLabel';
import { ProvenanceBadge } from '../../shared/provenance/ProvenanceBadge';
import { TraceStep } from './TraceStep';
import type { OfferTrace } from './types';

/** Render the owner-only trace for one offer. */
export function TracePage(): JSX.Element {
  const { challengeId = '' } = useParams();
  const { account } = useActingAccount();
  const trace = useApiQuery<OfferTrace>(`/api/challenges/${challengeId}/trace`);

  if (trace.error?.status === 404 || trace.error?.status === 401) {
    return (
      <EmptyState title="Only the listing owner can trace this offer">
        {account ? `You're acting as ${account.businessName}.` : 'Pick the owning business in the bar above.'} The trace includes private
        transactions, so nobody else can open it.
      </EmptyState>
    );
  }
  if (!trace.data) {
    return trace.error
      ? <ErrorState error={trace.error} onRetry={trace.reload} title="Couldn’t load the trace" />
      : <LoadingSpinner label="Tracing this number…" />;
  }

  const { savings, offer, scope_version: scope, listing, baseline, expense, transactions } = trace.data;
  const money = (amountMinor: number, currency = savings.currency): JSX.Element => <MoneyDisplay amountMinor={amountMinor} currency={currency} />;

  return (
    <section>
      <p><Link to={`/listings/${listing.id}/inbox`}>← Back to offers</Link></p>
      <h2 style={{ marginTop: 0 }}>Where this number comes from</h2>

      <TraceStep leadsTo="The offer being compared" step={1} title={<>{savings.label}: {money(savings.first_year_net_savings_minor)} first year</>}>
        <p style={{ margin: '0 0 0.25rem' }}>
          ({money(savings.baseline_monthly_minor)} current − {money(savings.offer_monthly_minor)} offer) × 12 months ={' '}
          <strong>{money(savings.annual_recurring_savings_minor)}</strong> annual recurring, then first-year costs subtracted ={' '}
          <strong>{money(savings.first_year_net_savings_minor)}</strong>.
        </p>
        {savings.is_provisional ? <p style={{ margin: '0 0 0.25rem' }}>Provisional, because:</p> : null}
        <ul style={{ margin: 0 }}>{savings.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
        <p style={{ color: '#475569', margin: '0.25rem 0 0' }}>Potential until a switch actually happens. Computed by the server, not estimated.</p>
      </TraceStep>

      <TraceStep leadsTo="The scope version this offer answered" step={2} title={`Offer from ${offer.challenger_name}`}>
        <p style={{ margin: '0 0 0.25rem' }}>
          {money(offer.price_minor, offer.price_currency)} / {offer.billing_frequency} = {money(offer.normalized_monthly_minor, offer.price_currency)} per month
          {offer.setup_fee_minor ? <> plus a {money(offer.setup_fee_minor, offer.price_currency)} setup fee</> : null}.
        </p>
        <p style={{ margin: '0 0 0.25rem' }}>
          Submitted {formatTimestamp(offer.submitted_at)}
          {offer.revised_at ? `, last revised ${formatTimestamp(offer.revised_at)} (${offer.revision_count} earlier ${offer.revision_count === 1 ? 'version' : 'versions'} kept)` : ''}.{' '}
          <ProvenanceBadge kind="offer" value={offer.provenance} /> <BiddingModePill mode={offer.bidding_mode_at_submission} />
        </p>
        <p style={{ margin: 0 }}>
          Covers {Math.round(offer.scope_completeness * 100)}% of scope. Includes: {offer.scope_included.join(', ') || 'nothing stated'}.
          {offer.scope_excluded.length ? ` Excludes: ${offer.scope_excluded.join(', ')}.` : ''}
          {offer.missing_items.length ? ` Missing: ${offer.missing_items.map(scopeItemLabel).join(', ')}.` : ''}
          {offer.unstated_items.length ? ` Not stated: ${offer.unstated_items.map(scopeItemLabel).join(', ')}.` : ''}
        </p>
      </TraceStep>

      <TraceStep leadsTo="The listing it was published on" step={3} title={`Scope version ${scope.version_number}`}>
        <p style={{ margin: '0 0 0.25rem' }}>
          Confirmed {formatTimestamp(scope.created_at)}.{' '}
          {scope.is_listing_current_version
            ? 'This is the listing’s current scope.'
            : `The listing has since moved to version ${listing.current_scope_version_number}; this offer still answers version ${scope.version_number}.`}
        </p>
        <p style={{ margin: 0 }}>
          {[
            scope.location_approximate ?? scope.service_area ?? 'location not specified',
            scope.square_footage ? `${scope.square_footage} sq ft` : 'square footage not specified',
            scope.visit_frequency ?? 'visit frequency not specified',
            scope.bathroom_count !== null ? `${scope.bathroom_count} bathrooms` : 'bathrooms not specified',
            scope.required_tasks.length ? `tasks: ${scope.required_tasks.join(', ')}` : 'tasks not specified',
            `supplies ${describeBoolean(scope.supplies_included)}`,
            `equipment ${describeBoolean(scope.equipment_included)}`,
            `taxes ${describeBoolean(scope.taxes_included)}`,
          ].join(' · ')}
        </p>
      </TraceStep>

      <TraceStep leadsTo="The current price offers are measured against" step={4} title={`Listing: ${categoryLabel(listing.category)}`}>
        <p style={{ margin: 0 }}>
          Published price {money(listing.price_minor, listing.price_currency)} / {listing.billing_cadence} ·{' '}
          {listing.visibility === 'public' ? 'public' : `now ${listing.visibility}`}
          {listing.published_at ? ` · published ${formatTimestamp(listing.published_at)}` : ''} ·{' '}
          <BiddingModePill mode={listing.bidding_mode} />
        </p>
      </TraceStep>

      <TraceStep leadsTo="The private expense behind that price" step={5} title="Current price baseline">
        <p style={{ margin: 0 }}>
          {money(baseline.amount_minor, baseline.currency)} / {baseline.cadence} = {money(baseline.monthly_minor, baseline.currency)} per month,{' '}
          {baseline.source === 'owner_confirmed_scope'
            ? `confirmed by the owner on scope version ${baseline.confirmed_on_scope_version} (prefilled from the transactions below).`
            : 'taken directly from the transaction baseline below.'}
        </p>
      </TraceStep>

      <TraceStep leadsTo={`The ${transactions.length} transactions behind it`} step={6} title={`Private expense: ${expense.vendor}`}>
        <p style={{ margin: 0 }}>
          {money(expense.amount_minor_per_period, expense.currency)} per {expense.cadence} period from {expense.period_count} payments
          ({formatTimestamp(expense.first_seen, { dateOnly: true })} to {formatTimestamp(expense.last_seen, { dateOnly: true })}),
          annualized to {money(expense.annualized_amount_minor, expense.currency)}. Recurrence confidence{' '}
          {Math.round(expense.recurrence_confidence * 100)}%.{' '}
          {expense.provenance.map((value) => <ProvenanceBadge key={value} kind="financial" value={value} />)}
        </p>
      </TraceStep>

      <TraceStep step={7} title="Original transactions (private, never published)">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}><th>Posted</th><th>Description</th><th>Amount</th><th>Source</th></tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td>{formatTimestamp(transaction.posted_at, { dateOnly: true })}</td>
                  <td>
                    <code>{transaction.raw_description}</code>
                    {transaction.is_excluded ? ` (excluded: ${transaction.excluded_reason})` : ''}
                  </td>
                  <td>{money(transaction.amount_minor, transaction.currency)}</td>
                  <td><ProvenanceBadge kind="financial" value={transaction.source_type} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TraceStep>
    </section>
  );
}

function describeBoolean(value: boolean | null): string {
  if (value === null) {
    return 'not specified';
  }
  return value ? 'included' : 'not included';
}
