/* Runs the publish flow for a signed-in business: confirm scope and disclosure, preview the exact public payload, then publish.
   Steps stay explicit so the owner sees what will become public before it does. The hook owns every API call. */
import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import type { DemoAccount } from '../../../shared/account/demoAccounts';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { Stack } from '../../../shared/ui';
import { ScopeForm } from '../form/ScopeForm';
import { PublishedPanel } from '../published/PublishedPanel';
import { publishStepStatuses } from '../steps/publishStepStatuses';
import { PublishSteps } from '../steps/PublishSteps';
import { StepCard } from '../steps/StepCard';
import { usePublish } from '../usePublish';
import { PreviewStepBody } from './PreviewStepBody';
import { PublishAction } from './PublishAction';
import { PublishHeader } from './PublishHeader';
import { usePreviewArrival } from './usePreviewArrival';

interface OwnerPublishFlowProps {
  account: DemoAccount;
}

/** Render the acting business's publish flow with loading, error, empty, in-progress, and published states. */
export function OwnerPublishFlow({ account }: OwnerPublishFlowProps): JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { expenses, preview, step, errorMessage, createDraft, invalidatePreview, publish } = usePublish();
  const { previewRef, hasShownPreview } = usePreviewArrival(preview?.payload_hash ?? null, step === 'previewing');

  // The confirmation replaces a long page while the owner is scrolled down to the Publish button;
  // start it at the top so the "now public" message and the public links are what they see first.
  useEffect(() => {
    if (step === 'published') {
      window.scrollTo({ top: 0 });
    }
  }, [step]);

  if (!expenses.data) {
    return (
      <Stack gap={6}>
        <PublishHeader />
        {expenses.error
          ? <ErrorState error={expenses.error} onRetry={expenses.reload} title="Couldn’t load your expenses" />
          : <LoadingSpinner label="Loading your expenses…" />}
      </Stack>
    );
  }

  // Already-public expenses are managed from the dashboard; re-drafting one would take it off the profile.
  const publishable = expenses.data.expenses.filter((expense) => expense.is_publishable && expense.visibility !== 'public');
  if (publishable.length === 0) {
    return (
      <Stack gap={6}>
        <PublishHeader />
        <EmptyState action={<Link to="/">Back to your dashboard</Link>} title="Nothing available to publish">
          Payroll, taxes, and transfers can never be published, and anything already public is managed from the dashboard.
          {expenses.data.expenses.length === 0 ? ' Import transactions first.' : ''}
        </EmptyState>
      </Stack>
    );
  }

  if (step === 'published' && preview) {
    return (
      <Stack gap={6}>
        <PublishHeader publishedListing={preview.projection} />
        <PublishSteps step={step} />
        <PublishedPanel account={account} onUnpublished={() => navigate('/')} published={preview} />
      </Stack>
    );
  }

  const [confirmStatus, previewStatus, publishStatus] = publishStepStatuses(step);
  // A failure with a preview still on screen came from Publish; without one it came from drafting, so it belongs by the form.
  const hasPreview = preview !== null;

  return (
    <Stack gap={6}>
      <PublishHeader />
      <PublishSteps step={step} />
      <StepCard description="A price with no scope isn’t something anyone can meaningfully counter." number={1} status={confirmStatus} title="Confirm the scope">
        <ScopeForm
          errorMessage={hasPreview ? null : errorMessage}
          expenses={publishable}
          hasFreshPreview={hasPreview}
          initialExpenseId={searchParams.get('expense')}
          isPublishing={step === 'publishing'}
          isSubmitting={step === 'drafting'}
          onEdit={invalidatePreview}
          onSubmit={createDraft}
        />
      </StepCard>
      <StepCard
        description="This is exactly what becomes public: a readable version and the literal payload the public API will serve."
        isFocusTarget
        number={2}
        ref={previewRef}
        status={previewStatus}
        title="Preview what goes public"
      >
        <PreviewStepBody hasShownPreview={hasShownPreview} isDrafting={step === 'drafting'} preview={preview} />
      </StepCard>
      <StepCard number={3} status={publishStatus} title="Publish">
        <PublishAction errorMessage={hasPreview ? errorMessage : null} onPublish={() => void publish()} preview={preview} step={step} />
      </StepCard>
    </Stack>
  );
}
