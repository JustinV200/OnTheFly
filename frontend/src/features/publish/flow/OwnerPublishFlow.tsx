/* Runs the publish flow for a signed-in business: loading, nothing-to-publish, the Scope → Preview → Publish wizard,
   and the published screen. It owns the two hooks (API calls and the draft) so the draft outlives every step change. */
import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { DemoAccount } from '../../../shared/account/demoAccounts';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { ButtonLink, Stack } from '../../../shared/ui';
import { useScopeDraft } from '../form/state/useScopeDraft';
import { PublishedScreen } from '../published/PublishedScreen';
import { PublishStepper } from '../stepper/PublishStepper';
import { usePublish } from '../usePublish';
import { PublishHeader } from './PublishHeader';
import { PublishWizard } from './PublishWizard';

interface OwnerPublishFlowProps {
  account: DemoAccount;
}

/** Render the acting business's publish flow with loading, error, empty, in-progress, and published states. */
export function OwnerPublishFlow({ account }: OwnerPublishFlowProps): JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const publishFlow = usePublish();
  const { expenses, preview, step, invalidatePreview } = publishFlow;

  // Already-public expenses are managed from the dashboard; re-drafting one would take it off the profile.
  const publishable = useMemo(
    () => (expenses.data?.expenses ?? []).filter((expense) => expense.is_publishable && expense.visibility !== 'public'),
    [expenses.data],
  );
  const draft = useScopeDraft(publishable, searchParams.get('expense'), invalidatePreview);

  // The confirmation replaces the publish step while the owner is scrolled down to its button; start it at the top.
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

  if (step === 'published' && preview) {
    return (
      <Stack gap={6}>
        <PublishHeader publishedListing={preview.projection} />
        <PublishStepper current="publish" isPreviewStale={false} isPublished />
        <PublishedScreen
          onUnpublished={() => navigate('/')}
          profileHandle={account.handle}
          published={preview}
          vendorName={draft.selectedExpense?.vendor ?? 'Your listing'}
        />
      </Stack>
    );
  }

  if (publishable.length === 0) {
    return (
      <Stack gap={6}>
        <PublishHeader />
        <EmptyState action={<ButtonLink to="/">Back to Spend</ButtonLink>} title="Nothing available to publish">
          Payroll, taxes, and transfers can never be published, and anything already public is managed from Spend.
          {expenses.data.expenses.length === 0 ? ' Import transactions first.' : ''}
        </EmptyState>
      </Stack>
    );
  }

  return (
    <Stack gap={6}>
      <PublishHeader />
      <PublishWizard draft={draft} expenses={publishable} publishFlow={publishFlow} />
    </Stack>
  );
}
