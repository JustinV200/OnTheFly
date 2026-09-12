/* Runs the publish flow: confirm scope and disclosure, preview the exact public payload, then publish.
   Steps stay explicit so the owner sees what will become public before it does. */
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useActingAccount } from '../../shared/account/ActingAccountContext';
import type { DemoAccount } from '../../shared/account/demoAccounts';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { PublishedPanel } from './PublishedPanel';
import { PublishPreview } from './PublishPreview';
import { ScopeForm } from './ScopeForm';
import { usePublish } from './usePublish';

/** Render the publish flow for the acting business, or a signed-out state. */
export function PublishFlow(): JSX.Element {
  const { account } = useActingAccount();
  if (!account) {
    return (
      <EmptyState title="Signed out: nothing to publish">
        Only a business can publish its own expenses. Pick one in the bar above.
      </EmptyState>
    );
  }
  return <OwnerPublishFlow account={account} />;
}

function OwnerPublishFlow({ account }: { account: DemoAccount }): JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { expenses, preview, step, errorMessage, createDraft, invalidatePreview, publish } = usePublish();

  if (!expenses.data) {
    return expenses.error
      ? <ErrorState error={expenses.error} onRetry={expenses.reload} title="Couldn’t load your expenses" />
      : <LoadingSpinner label="Loading your expenses…" />;
  }

  // Already-public expenses are managed from the dashboard; re-drafting one would take it off the profile.
  const publishable = expenses.data.expenses.filter((expense) => expense.is_publishable && expense.visibility !== 'public');
  if (publishable.length === 0) {
    return (
      <EmptyState action={<Link to="/">Back to your dashboard</Link>} title="Nothing available to publish">
        Payroll, taxes, and transfers can never be published, and anything already public is managed from the dashboard.
        {expenses.data.expenses.length === 0 ? ' Import transactions first.' : ''}
      </EmptyState>
    );
  }

  if (step === 'published' && preview) {
    return <PublishedPanel account={account} listing={preview.projection} onUnpublished={() => navigate('/')} />;
  }

  return (
    <section>
      <ScopeForm
        expenses={publishable}
        initialExpenseId={searchParams.get('expense')}
        isPublishing={step === 'publishing'}
        isSubmitting={step === 'drafting'}
        onEdit={invalidatePreview}
        onSubmit={createDraft}
      />
      {errorMessage ? <ErrorState error={null} title={errorMessage} /> : null}
      <PublishPreview preview={preview} />
      {/* Any form edit clears the preview (usePublish.invalidatePreview), so Publish only ever posts a fresh one. */}
      {preview ? (
        <div style={{ marginTop: '1rem' }}>
          <button
            disabled={step !== 'previewing'}
            onClick={() => void publish()}
            style={{ fontSize: '1.05rem', fontWeight: 700, padding: '0.5rem 1rem' }}
            type="button"
          >
            {step === 'publishing' ? 'Publishing…' : '3. Publish this listing'}
          </button>{' '}
          <span style={{ color: '#475569' }}>
            Changing anything above clears this preview; preview again before publishing. Nothing is public until you click publish.
          </span>
        </div>
      ) : null}
    </section>
  );
}
