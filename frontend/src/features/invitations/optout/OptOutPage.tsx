/* The page behind "Opt out" in every invitation footer. No account needed. Opening the link changes nothing (mail
   scanners follow links); the recipient confirms with one click. It shows only a masked address, never which business
   or listing invited them. */
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { ApiError, post } from '../../../shared/api/client';
import { useApiQuery } from '../../../shared/api/useApiQuery';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { Button, Callout, Card, PageHeader, Stack } from '../../../shared/ui';
import type { OptOutDescription } from '../types';
import './OptOutPage.css';

/** Render the opt-out confirmation page for the token in the URL. */
export function OptOutPage(): JSX.Element {
  const { token = '' } = useParams();
  const path = `/api/invitations/opt-out/${encodeURIComponent(token)}`;
  const description = useApiQuery<OptOutDescription>(path);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [submitError, setSubmitError] = useState<ApiError | null>(null);

  const confirm = async (): Promise<void> => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await post<{ opted_out: boolean }>(path);
      setIsDone(true);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }
      setSubmitError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  let body: JSX.Element;
  if (!description.data) {
    body = description.error?.status === 404
      ? <EmptyState title="This opt-out link isn’t valid">It may have been copied incompletely. Nothing was changed.</EmptyState>
      : description.error
        ? <ErrorState error={description.error} onRetry={description.reload} title="Couldn’t check this link" />
        : <LoadingSpinner label="Checking this link…" />;
  } else if (isDone || description.data.already_opted_out) {
    body = (
      <Callout role="status" title="You won’t get invitations from On the Fly" tone="success">
        <p>{description.data.email_masked ?? 'This address'} is opted out of all future supplier invitations. There is nothing else to do.</p>
      </Callout>
    );
  } else {
    body = (
      <Card title="Stop supplier invitations">
        <Stack gap={4}>
          <p>
            Businesses on On the Fly can invite suppliers to bid on work they publish. Opting out stops every future invitation to{' '}
            <strong>{description.data.email_masked ?? 'this address'}</strong>, from any business.
          </p>
          {submitError ? <ErrorState error={submitError} title="Couldn’t opt out" /> : null}
          <div>
            <Button isBusy={isSubmitting} onClick={() => void confirm()} variant="primary">
              {isSubmitting ? 'Opting out…' : 'Opt out of invitations'}
            </Button>
          </div>
        </Stack>
      </Card>
    );
  }

  return (
    <div className="opt-out-page">
      <Stack gap={6}>
        <PageHeader title="Invitation preferences" />
        {body}
      </Stack>
    </div>
  );
}
