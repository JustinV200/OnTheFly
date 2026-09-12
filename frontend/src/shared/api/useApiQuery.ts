/* Loads one API resource with loading, error, reload, and optional polling state.
   Pages render from this instead of hand-rolling effects, so none is left spinning forever on a failure. */
import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, get } from './client';

interface ApiQueryOptions {
  // Polling is the app's update mechanism (CLAUDE.md, "Updates: polling. No websockets.").
  pollIntervalMs?: number;
}

export interface ApiQueryState<T> {
  data: T | null;
  // The most recent failure. data can still hold the last good response when a background poll fails.
  error: ApiError | null;
  // True while a non-poll request is in flight. With data still present it means a reload is
  // refreshing what's on screen, so pages show a spinner only when data is null.
  isLoading: boolean;
  reload: () => void;
}

/** Fetch path (skipped when null) and keep its state; changing path refetches. */
export function useApiQuery<T>(path: string | null, options: ApiQueryOptions = {}): ApiQueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(path !== null);
  const [reloadCount, setReloadCount] = useState(0);
  const loadedPathRef = useRef<string | null>(null);
  const { pollIntervalMs } = options;

  useEffect(() => {
    if (loadedPathRef.current !== path) {
      // A different resource: last path's data must not render under the new one (e.g. a filter).
      // A reload of the same path keeps its data, so refreshing after an action doesn't flash.
      loadedPathRef.current = path;
      setData(null);
      setError(null);
    }
    if (path === null) {
      setIsLoading(false);
      return undefined;
    }

    let isCancelled = false;
    const load = async (isPoll: boolean): Promise<void> => {
      if (!isPoll) {
        setIsLoading(true);
      }
      try {
        const response = await get<T>(path);
        if (!isCancelled) {
          setData(response);
          setError(null);
        }
      } catch (caught) {
        if (!isCancelled) {
          setError(caught instanceof ApiError ? caught : unexpectedError(caught));
        }
      } finally {
        if (!isCancelled && !isPoll) {
          setIsLoading(false);
        }
      }
    };

    void load(false);
    const timer = pollIntervalMs ? window.setInterval(() => void load(true), pollIntervalMs) : undefined;
    return () => {
      // A response for a previous path or an unmounted page must not overwrite current state.
      isCancelled = true;
      if (timer !== undefined) {
        window.clearInterval(timer);
      }
    };
  }, [path, pollIntervalMs, reloadCount]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);
  return { data, error, isLoading, reload };
}

function unexpectedError(caught: unknown): ApiError {
  // Anything other than ApiError is a frontend bug; log it loudly and still show a visible state.
  console.error('Unexpected error while loading API data', caught);
  return new ApiError(-1, { error: 'client_error', detail: String(caught) });
}
