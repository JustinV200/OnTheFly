/* Renders a visible failure with the API's own reason and an optional retry.
   It distinguishes "couldn't reach the API" from "the API said no" so nobody debugs the wrong thing. */
import type { ReactNode } from 'react';

import { ApiError, NETWORK_FAILURE_STATUS } from '../api/client';
import { Button, Callout } from '../ui';
import './pageStates.css';

interface ErrorStateProps {
  title: string;
  error: ApiError | null;
  onRetry?: () => void;
  children?: ReactNode;
}

/** Render an alert callout for a failed load or action. */
export function ErrorState({ title, error, onRetry, children }: ErrorStateProps): JSX.Element {
  const isNetwork = error?.status === NETWORK_FAILURE_STATUS;
  return (
    <Callout
      actions={onRetry ? <Button onClick={onRetry} size="sm">Try again</Button> : undefined}
      as="section"
      className="page-state"
      role="alert"
      title={title}
      tone="danger"
    >
      {error || children ? (
        <>
          {error ? (
            <p>
              {isNetwork ? null : <strong>HTTP {error.status}: </strong>}
              {error.message}
            </p>
          ) : null}
          {children}
        </>
      ) : null}
    </Callout>
  );
}
