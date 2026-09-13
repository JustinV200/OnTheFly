/* Traces one potential-savings figure down to the transactions behind it, one linked step at a time.
   That chain is the product's claim to credibility (roadmap 09, "Trace one number all the way down"). Every figure comes from the server.
   The headline carries the number and a path to each step; the steps render as one ordered list on a vertical rail. */
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { useApiQuery } from '../../shared/api/useApiQuery';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { usePublishBrainStimulus } from '../../shared/flybrain/live';
import { Badge, ButtonLink, Icon, PageHeader, Stack } from '../../shared/ui';
import { TraceHeadline } from './headline/TraceHeadline';
import { useTraceRequirements } from './requirements/useTraceRequirements';
import { ListingStep } from './steps/offer/ListingStep';
import { OfferStep } from './steps/offer/OfferStep';
import { SavingsStep } from './steps/offer/SavingsStep';
import { ScopeStep } from './steps/offer/ScopeStep';
import { BaselineStep } from './steps/spend/BaselineStep';
import { ExpenseStep } from './steps/spend/ExpenseStep';
import { TransactionsStep } from './steps/spend/TransactionsStep';
import type { OfferTrace } from './types';
import './TracePage.css';

const TITLE = 'Where this number comes from';

/** Render the owner-only trace for one offer. */
export function TracePage(): JSX.Element {
  const { challengeId = '' } = useParams();
  const { account } = useActingAccount();
  const trace = useApiQuery<OfferTrace>(`/api/challenges/${challengeId}/trace`);
  // The fly brain view plays alongside; nothing on this page waits for it.
  usePublishBrainStimulus(trace.data?.brain_stimulus);
  // Called on every render, as hooks must be; it requests nothing until the trace has named the listing.
  const requirementContext = useTraceRequirements(trace.data?.listing.id ?? null, challengeId);

  if (trace.error?.status === 404 || trace.error?.status === 401) {
    return (
      <TracePageFrame>
        <EmptyState action={<ButtonLink to="/marketplace">Back to the marketplace</ButtonLink>} title="Only the listing owner can trace this offer">
          {account ? `You're acting as ${account.businessName}.` : 'Pick the owning business in the bar above.'} The trace includes private
          transactions, so nobody else can open it.
        </EmptyState>
      </TracePageFrame>
    );
  }
  if (!trace.data) {
    return (
      <TracePageFrame>
        {trace.error
          ? <ErrorState error={trace.error} onRetry={trace.reload} title="Couldn’t load the trace" />
          : <LoadingSpinner label="Tracing this number…" />}
      </TracePageFrame>
    );
  }

  const { savings, offer, scope_version: scope, listing, baseline, expense, transactions, fly_brain: flyBrain } = trace.data;

  return (
    <Stack className="trace-page" gap={6}>
      <PageHeader
        eyebrow={(
          <Link className="trace-page__back" to={`/listings/${listing.id}/inbox`}>
            <Icon name="arrow-left" size={14} />
            Offers on this listing
          </Link>
        )}
        meta={<Badge icon={<Icon name="lock" />} tone="private">Private: only you can open this trace</Badge>}
        subtitle="Each step is explained by the one after it, from the potential savings figure down to the private transactions behind it."
        title={TITLE}
      />
      <TraceHeadline trace={trace.data} />
      <ol className="trace-chain">
        <SavingsStep
          earlierScopeVersion={scope.is_listing_current_version ? null : scope.version_number}
          offerProvenance={offer.provenance}
          savings={savings}
          unrankedReason={offer.unranked_reason}
        />
        <OfferStep offer={offer} requirementContext={requirementContext} scopeVersionNumber={scope.version_number} />
        <ScopeStep currentScopeVersionNumber={listing.current_scope_version_number} requirementContext={requirementContext} scope={scope} />
        <ListingStep listing={listing} title={requirementContext.status === 'ready' ? requirementContext.title : null} />
        <BaselineStep baseline={baseline} scope={scope} />
        <ExpenseStep expense={expense} transactions={transactions} />
        <TransactionsStep flyBrain={flyBrain} transactions={transactions} />
      </ol>
    </Stack>
  );
}

// Gives the states shown before the trace loads the page's h1, so no message sits under a missing heading.
function TracePageFrame({ children }: { children: ReactNode }): JSX.Element {
  return (
    <Stack className="trace-page" gap={6}>
      <PageHeader title={TITLE} />
      {children}
    </Stack>
  );
}
