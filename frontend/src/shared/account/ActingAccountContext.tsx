/* Shares the acting demo business across the app so a switch re-renders every page as that business.
   State and the API client's header both come from this tab's in-memory store, so within a tab they
   can't disagree. A switch in another tab changes neither: each window keeps acting as its own business
   (a new tab starts from the last choice). There is deliberately no storage-event listener, which would
   make every window follow the last switch and remount a half-typed offer form. A ?as= link picks the tab's
   business on load (accountLink.ts). */
import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import { readAccountLink } from './accountLink';
import { actingAccountStore } from './actingAccountStore';
import { DemoAccount, demoAccounts } from './demoAccounts';

interface ActingAccountValue {
  // null is a signed-out public visitor: no X-Account-ID header, only public pages have data.
  account: DemoAccount | null;
  setAccountId: (accountId: string | null) => void;
}

const ActingAccountContext = createContext<ActingAccountValue | null>(null);

/** Provide the acting account: a ?as= link in the opening URL wins, else the tab's store, so a refresh keeps the business. */
export function ActingAccountProvider({ children }: { children: ReactNode }): JSX.Element {
  const [accountId, setAccountIdState] = useState<string | null>(() => {
    // Applied here, before the first render, rather than in an effect: every page's first request must already carry
    // the linked business, or it would briefly fetch as the stored one. Removing the parameter is app/account's job.
    const linkedId = readAccountLink(window.location.search);
    if (linkedId !== undefined) {
      actingAccountStore.write(linkedId);
      return linkedId;
    }

    const storedId = actingAccountStore.read();
    if (storedId !== null && !demoAccounts.some((candidate) => candidate.id === storedId)) {
      // A stale id (e.g. a renamed seed) is cleared in the store, not just hidden: the API client
      // reads the store and would otherwise keep sending it while the UI shows a public visitor.
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
