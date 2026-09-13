/* Fetches the spend-signals report for one selected expense.
   A failed load is surfaced as a message, never as an empty "no signals" report. */
import { useEffect, useState } from 'react';

import { ApiError, get } from '../../../shared/api/client';
import { publishBrainStimulus } from '../../../shared/flybrain/live';
import type { SpendSignalsReport } from './types';

interface UseSpendSignalsResult {
  report: SpendSignalsReport | null;
  isLoading: boolean;
  error: string | null;
}

/** Load signals whenever the expense changes; stale responses for a previous expense are ignored. */
export function useSpendSignals(expenseId: string): UseSpendSignalsResult {
  const [report, setReport] = useState<SpendSignalsReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Selecting another expense mid-request must not show the first expense's signals.
    let isCurrent = true;
    setIsLoading(true);
    setReport(null);
    setError(null);

    void (async () => {
      try {
        const response = await get<SpendSignalsReport>(`/api/spend-signals/${expenseId}`);
        if (isCurrent) {
          setReport(response);
          // Hands the charges' input to the fly brain view, which plays it separately; the report is already final.
          publishBrainStimulus(response.brain_stimulus);
        }
      } catch (caught) {
        if (isCurrent) {
          setError(
            caught instanceof ApiError
              ? `Spend signals are unavailable: ${caught.message}`
              : 'Spend signals are unavailable: the backend could not be reached.',
          );
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [expenseId]);

  return { report, isLoading, error };
}
