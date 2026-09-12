/* Renders a visible failure with the API's own reason and an optional retry.
   It distinguishes "couldn't reach the API" from "the API said no" so nobody debugs the wrong thing. */
import type { ReactNode } from 'react';

import { ApiError, NETWORK_FAILURE_STATUS } from '../api/client';

interface ErrorStateProps {
  title: string;
  error: ApiError | null;
  onRetry?: () => void;
  children?: ReactNode;
}

/** Render an alert card for a failed load or action. */
export function ErrorState({ title, error, onRetry, children }: ErrorStateProps): JSX.Element {
  const isNetwork = error?.status === NETWORK_FAILURE_STATUS;
  return (
    <section
      role="alert"
      style={{
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '12px',
        color: '#7f1d1d',
        margin: '1rem 0',
        padding: '1rem 1.25rem',
      }}
    >
      <h3 style={{ margin: '0 0 0.5rem' }}>{title}</h3>
      {error ? (
        <p style={{ margin: 0 }}>
          {isNetwork ? null : <strong>HTTP {error.status}: </strong>}
          {error.message}
        </p>
      ) : null}
      {children}
      {onRetry ? (
        <button onClick={onRetry} style={{ marginTop: '0.75rem' }} type="button">
          Try again
        </button>
      ) : null}
    </section>
  );
}
