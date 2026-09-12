/* Shares the acting demo business across the app so a switch re-renders every page as that business.
   The API client reads the same store, so the header and the UI can't disagree about who is acting. */
import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import { actingAccountStore } from './actingAccountStore';
import { DemoAccount, demoAccounts } from './demoAccounts';

interface ActingAccountValue {
  // null is a signed-out public visitor: no X-Account-ID header, only public pages have data.
  account: DemoAccount | null;
  setAccountId: (accountId: string | null) => void;
}

const ActingAccountContext = createContext<ActingAccountValue | null>(null);

/** Provide the acting account, starting from storage so a refresh keeps the current business. */
export function ActingAccountProvider({ children }: { children: ReactNode }): JSX.Element {
  const [accountId, setAccountIdState] = useState<string | null>(() => {
    const storedId = actingAccountStore.read();
    if (storedId !== null && !demoAccounts.some((candidate) => candidate.id === storedId)) {
      // A stale id (e.g. a renamed seed) is cleared, not just hidden: the API client reads the
      // store directly and would otherwise keep sending it while the UI shows a public visitor.
      actingAccountStore.write(null);
      return null;
    }
    return storedId;
  });

  const setAccountId = useCallback((nextId: string | null): void => {
    actingAccountStore.write(nextId);
    setAccountIdState(nextId);
  }, []);

  const value = useMemo<ActingAccountValue>(() => {
    const account = demoAccounts.find((candidate) => candidate.id === accountId) ?? null;
    return { account, setAccountId };
  }, [accountId, setAccountId]);

  return <ActingAccountContext.Provider value={value}>{children}</ActingAccountContext.Provider>;
}

/** Return the acting account and the setter; must be used under ActingAccountProvider. */
export function useActingAccount(): ActingAccountValue {
  const value = useContext(ActingAccountContext);
  if (value === null) {
    throw new Error('useActingAccount must be used inside ActingAccountProvider');
  }
  return value;
}
