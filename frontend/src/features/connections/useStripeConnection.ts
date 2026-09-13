/* Owns Stripe consent, company-scoped imports, and cancellable bounded polling. */
import { useEffect, useRef, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { apiFetch, post } from '../../shared/api/client';
import type { ExpenseTransaction } from '../dashboard/types';
import { STRIPE_MESSAGES } from './stripe/stripeMessages';

interface ConnectionState {
  connected: boolean;
  last_synced_at: string | null;
  status: string;
}

/** What the hook exposes. The Spend page owns one of these and hands it to both the Stripe sandbox row and its
    "no financial account connected" state, so either place starts the same connect. */
export interface StripeConnectionController {
  connection: ConnectionState | null;
  transactions: ExpenseTransaction[];
  busy: boolean;
  message: string;
  connect: () => Promise<void>;
  refresh: () => Promise<void>;
}

// Thrown only by the sync whose own timer fired, so an earlier run's timeout can't relabel a later failure.
class ImportTimeoutError extends Error {
  public constructor() {
    super('Stripe import exceeded its time bound.');
    this.name = 'ImportTimeoutError';
  }
}

/** Connect one sandbox checking account and persist imported transactions through the API.
    onConnected runs once consent is stored, before any import, so sibling panels re-read the same link. */
export function useStripeConnection(onImported: () => void, onConnected: () => void): StripeConnectionController {
  const [connection, setConnection] = useState<ConnectionState | null>(null);
  const [busy, setBusy] = useState(false);
  const [transactions, setTransactions] = useState<ExpenseTransaction[]>([]);
  const [message, setMessage] = useState('');
  const controller = useRef<AbortController | null>(null);
  const active = useRef(true);
  const base = '/api/connections/stripe';

  useEffect(() => {
    active.current = true;
    const initial = new AbortController();
    void apiFetch<ExpenseTransaction[]>(`${base}/transactions`, { signal: initial.signal })
      .then(setTransactions).catch((error: unknown) => {
        if (!initial.signal.aborted) setMessage(error instanceof Error ? error.message : 'Transactions unavailable.');
      });
    void apiFetch<ConnectionState>(base, { signal: initial.signal })
      .then(setConnection)
      .catch((error: unknown) => {
        if (!initial.signal.aborted) setMessage(error instanceof Error ? error.message : 'Connection status unavailable.');
      });
    return () => { active.current = false; initial.abort(); controller.current?.abort(); };
  }, []);

  const sync = async (refresh: boolean): Promise<void> => {
    const abort = new AbortController();
    controller.current = abort;
    // Local to this sync: the unmount cleanup also aborts, and that must not read as a timeout.
    let timedOut = false;
    // Bound the whole operation, including HTTP time, rather than just counting polls.
    const timeout = window.setTimeout(() => { timedOut = true; abort.abort(); }, 120000);
    try {
      let first = true;
      while (!abort.signal.aborted) {
        const result = await apiFetch<ConnectionState>(`${base}/sync?refresh=${first && refresh}`, {
          method: 'POST', signal: abort.signal,
        });
        first = false;
        setConnection(result);
        if (result.status === 'succeeded') {
          setTransactions(await apiFetch<ExpenseTransaction[]>(`${base}/transactions`, { signal: abort.signal }));
          setMessage(STRIPE_MESSAGES.imported);
          onImported();
          return;
        }
        setMessage(STRIPE_MESSAGES.waiting);
        await new Promise<void>((resolve) => window.setTimeout(resolve, 3000));
      }
      // The loop only ends by abort: this sync's timeout, or the unmount cleanup, which shows no message.
      throw new Error('Stripe import was stopped before it finished.');
    } catch (error: unknown) {
      // An aborted request surfaces as a network ApiError, so the flag, not the error, says time ran out.
      throw timedOut ? new ImportTimeoutError() : error;
    } finally { window.clearTimeout(timeout); }
  };

  const run = async (connect: boolean): Promise<void> => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      if (connect) {
        const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
        if (!key?.startsWith('pk_test_')) throw new Error('Configure VITE_STRIPE_PUBLISHABLE_KEY with a sandbox key.');
        const stripe = await loadStripe(key);
        if (!stripe) throw new Error('Stripe could not load. Check your connection.');
        const session = await post<{ id: string; client_secret: string }>(`${base}/session`);
        const result = await stripe.collectFinancialConnectionsAccounts({ clientSecret: session.client_secret });
        if (!active.current) return;
        if (result.error) throw new Error(result.error.message ?? 'Stripe connection failed.');
        if (!result.financialConnectionsSession?.accounts.length) {
          setMessage(STRIPE_MESSAGES.cancelled);
          return;
        }
        setConnection(await post<ConnectionState>(`${base}/complete`, { session_id: session.id }));
        // Stripe's refresh can stay pending for minutes, so don't wait for the import to tell the dashboard
        // this business is now connected.
        onConnected();
      }
      await sync(!connect);
    } catch (error: unknown) {
      // Only this run's own timeout reads as a timeout; session, modal, and /complete failures keep their cause.
      if (active.current) setMessage(error instanceof ImportTimeoutError
        ? STRIPE_MESSAGES.timedOut
        : error instanceof Error ? error.message : 'Import failed. Try again.');
    } finally { if (active.current) setBusy(false); }
  };

  return { connection, transactions, busy, message, connect: () => run(true), refresh: () => run(false) };
}
