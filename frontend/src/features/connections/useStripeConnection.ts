/* Owns Stripe consent, company-scoped imports, and cancellable bounded polling. */
import { useEffect, useRef, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { apiFetch, post } from '../../shared/api/client';
import type { ExpenseTransaction } from '../dashboard/types';

interface ConnectionState {
  connected: boolean;
  last_synced_at: string | null;
  status: string;
}

/** Connect one sandbox checking account and persist imported transactions through the API.
    onConnected runs once consent is stored, before any import, so sibling panels re-read the same link. */
export function useStripeConnection(onImported: () => void, onConnected: () => void) {
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
    // Bound the whole operation, including HTTP time, rather than just counting polls.
    const timeout = window.setTimeout(() => abort.abort(), 120000);
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
          setMessage('Stripe sandbox transactions imported.');
          onImported();
          return;
        }
        setMessage('Waiting for Stripe to prepare transactions…');
        await new Promise<void>((resolve) => window.setTimeout(resolve, 3000));
      }
      throw new Error('Stripe is still preparing data. Use Refresh to try again.');
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
          setMessage('Connection cancelled. No account imported.');
          return;
        }
        setConnection(await post<ConnectionState>(`${base}/complete`, { session_id: session.id }));
        // Stripe's refresh can stay pending for minutes, so don't wait for the import to tell the dashboard
        // this business is now connected.
        onConnected();
      }
      await sync(!connect);
    } catch (error: unknown) {
      if (active.current) setMessage(controller.current?.signal.aborted
        ? 'Import timed out. Use Refresh to resume.'
        : error instanceof Error ? error.message : 'Import failed. Try again.');
    } finally { if (active.current) setBusy(false); }
  };

  return { connection, transactions, busy, message, connect: () => run(true), refresh: () => run(false) };
}
