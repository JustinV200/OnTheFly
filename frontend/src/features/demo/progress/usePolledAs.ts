/* Loads one API path as a named demo business, polling, whatever this tab is acting as. The demo guide uses it to show
   each business's own view side by side; every request carries exactly that business's identity, so each response is
   only what that business could fetch itself. */
import { useCallback, useEffect, useState } from 'react';

import { ApiError, getAs } from '../../../shared/api/client';

export interface PolledState<T> {
  data: T | null;
  error: ApiError | null;
  reload: () => void;
}

/** Fetch path as accountId every intervalMs; the latest good response stays while a poll fails. */
export function usePolledAs<T>(path: string, accountId: string, intervalMs: number): PolledState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    const load = async (): Promise<void> => {
      try {
        const response = await getAs<T>(path, accountId);
        if (!isCancelled) {
          setData(response);
          setError(null);
        }
      } catch (caught) {
        if (isCancelled) {
          return;
        }
        if (!(caught instanceof ApiError)) {
          throw caught;
        }
        setError(caught);
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), intervalMs);
    return () => {
      isCancelled = true;
      window.clearInterval(timer);
    };
  }, [path, accountId, intervalMs, reloadCount]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);
  return { data, error, reload };
}
